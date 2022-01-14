import {WebClient} from '@slack/web-api';
import {Message} from '@slack/web-api/dist/response/ConversationsHistoryResponse';
import {readFileSync} from 'fs';

const delims = '→|(->)|,';

const loadKanji = (): string => {
  return readFileSync('./data/jis1.txt').toString().trim();
};

const randrange = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};

const getTodaysHistory = async (web: WebClient, channelID: string) => {
  const ts = Math.floor(Date.now().valueOf() / 1000) - 60*60*12; // 12時間前のunixtime

  return await web.conversations.history({
    channel: channelID,
    oldest: ts.toString(),
  });
};

type Question = {
    start: string;
    end: string;
}

export const getQuestion = (messages: Message[]): Question => {
  for (const msg of messages) {
    if (msg.type !== 'message') {
      continue;
    }
    if (!msg.bot_id) {
      continue;
    }
    if (!msg.text!.startsWith('今日の問題')) {
      continue;
    }
    const matches = [...msg.text.matchAll(/\[(.)\]/g)];
    return {
      start: matches[0][1],
      end: matches[1][1],
    };
  }
  throw new Error('no question message');
};

type Attempt = {
    msg: Message;
    matches: string[];
}

export const getAttempts = (question: Question, messages: Message[]): Attempt[] => {
  return messages.flatMap((msg) => {
    if (msg.type !== 'message') {
      return [];
    }
    if (!msg.user || !msg.text) {
      return [];
    }
    if (!msg.text.match(delims)) {
      return [];
    }

    // AB → BC → CD → .. の構造を抽出する
    const pattern = RegExp(`(..\\s*(?=${delims}))|((?<=${delims})\\s*..)`, 'g');
    const matches: string[] = (msg.text.match(pattern) || []).map((s: string) => s.trim());
    if (matches.length <= 1) {
      return [];
    }

    // assert
    if (question.start !== matches[0][0] || question.end !== matches.at(-1)[1]) {
      return [];
    }
    for (let i = 0; i < matches.length - 1; i++) {
      if (i !== 0 && matches[i-1][1] !== matches[i][0]) {
        return [];
      }
      if (matches[i][1] !== matches[i+1][0]) {
        return [];
      }
    }

    return [{
      msg: msg,
      matches: matches,
    }];
  });
};

export const getFirstBloodIndex = (attempts: Attempt[]) => {
  let minIndex = -1;
  let minTime = Number.MAX_VALUE;
  attempts.forEach((a, i) => {
    const t = parseFloat(a.msg.ts);
    if (t < minTime) {
      minIndex = i;
      minTime = t;
    }
  });
  return minIndex;
};

const getUserMap = async (web: WebClient) => {
  const users = await web.users.list({});
  if (!users.ok) {
    throw new Error(users.error);
  }
  const userMap = new Map<string, string>();
  users.members.forEach((m) => {
    userMap.set(m.id, m.profile.display_name);
  });
  return userMap;
};

export const doQuestion = async (web: WebClient, channelID: string) => {
  const kanji = loadKanji();
  const i = randrange(0, kanji.length);
  const j = randrange(0, kanji.length);

  await web.chat.postMessage({
    channel: channelID,
    text: `今日の問題： [${kanji[i]}]から[${kanji[j]}]まで繋げて下さい`,
  });
};

export const doAnswer = async (web: WebClient, channelID: string) => {
  const userMap = await getUserMap(web);
  const history = await getTodaysHistory(web, channelID);
  if (!history.ok) {
    console.log(history.error);
    process.exit(1);
  }
  const question = getQuestion(history.messages!);
  const attempts = getAttempts(question, history.messages!);

  // 短いほど、また速いほど良い
  attempts.sort((a, b) => {
    if (a.matches.length < b.matches.length) {
      return -1;
    }
    if (a.matches.length > b.matches.length) {
      return 1;
    }
    return parseFloat(a.msg.ts) - parseFloat(b.msg.ts);
  });
  const firstBloodIndex = getFirstBloodIndex(attempts);

  const msgs = [];
  attempts.forEach((a, i) => {
    let s = '  ';
    if (i === 0) {
      s += ':crown:';
    }
    if (i === firstBloodIndex) {
      s += ':zap:';
    }
    s += userMap.get(a.msg.user);
    s += ' ' + a.matches.join(' → ');
    msgs.push(s);
  });

  await web.chat.postMessage({
    channel: channelID,
    text: ':stopwatch: 回答を締め切ります。本日の結果\n' + msgs.join('\n'),
  });
};

const main = async () => {
  if (process.argv.length <= 2) {
    console.log('usage: USER_TOKEN=... CHANNEL_ID=... node index.js <question|answer>');
  }

  const token = process.env.USER_TOKEN;
  const channelID = process.env.CHANNEL_ID;

  const web = new WebClient(token);

  console.log(process.argv);
  if (process.argv[2] === 'question') {
    await doQuestion(web, channelID);
  } else if (process.argv[2] === 'answer') {
    await doAnswer(web, channelID);
  } else {
    console.log('usage: USER_TOKEN=... CHANNEL_ID=... node index.js <question|answer>');
  }
};

if (require.main === module) {
  main().then(() => process.exit(0));
}
