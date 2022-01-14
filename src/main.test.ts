import {getQuestion, getAttempts, getFirstBloodIndex, doAnswer} from './main';
import {WebClient} from '@slack/web-api';
import './main';

const messages = [
  {
    'client_msg_id': 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'type': 'message',
    'text': '誘導,容赦はズル',
    'user': 'ZZZZZZZZZ',
    'ts': '1642126151.021700',
    'team': 'XXXXXXXXX',
    'blocks': [],
  },
  {
    'client_msg_id': 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'type': 'message',
    'text': 'あー 誘導,導入,入手,手形,形容,容赦とかか',
    'user': 'YYYYYYYYY',
    'ts': '1642126151.021700',
    'team': 'XXXXXXXXX',
    'blocks': [],
  },
  {
    'client_msg_id': 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'type': 'message',
    'text': '誘引 → 引責 → 責任 → 任官 → 官許 → 許容 → 容赦',
    'user': 'XXXXXXXXX',
    'ts': '1642126149.021400',
    'team': 'XXXXXXXXX',
    'blocks': [],
  },
  {
    'type': 'message',
    'subtype': 'bot_message',
    'text': '今日の問題： [誘]から[赦]まで繋げてください',
    'ts': '1642125292.017500',
    'bot_id': 'XXXXXXXXXXX',
  },
  {
    'type': 'message',
    'subtype': 'channel_join',
    'ts': '1642123882.017400',
    'user': 'XXXXXXXXX',
    'text': '<@XXXXXXXXX> has joined the channel',
  },
];

test('getQuestion', () => {
  const q = getQuestion(messages);
  expect(q).toStrictEqual({start: '誘', end: '赦'});
});

test('getAttempts', () => {
  const q = getQuestion(messages);
  const attempts = getAttempts(q, messages);

  expect(attempts).toEqual(expect.arrayContaining([
    {
      msg: expect.anything(),
      matches: ['誘引', '引責', '責任', '任官', '官許', '許容', '容赦'],
    }, {
      msg: expect.anything(),
      matches: ['誘導', '導入', '入手', '手形', '形容', '容赦'],
    }]));
});

test('getFirstBloodIndex', () => {
  const q = getQuestion(messages);
  const attempts = getAttempts(q, messages);
  const idx = getFirstBloodIndex(attempts);

  expect(attempts[idx]).toEqual({
    msg: expect.anything(),
    matches: ['誘引', '引責', '責任', '任官', '官許', '許容', '容赦'],
  });
});

test('doAnswer', async () => {
  const fn = jest.fn();
  const web = {
    chat: {
      postMessage: fn,
    },
    conversations: {
      history: jest.fn().mockResolvedValue({
        ok: true,
        messages: messages,
      }),
    },
    users: {
      list: jest.fn().mockResolvedValue({
        ok: true,
        members: [
          {
            id: 'XXXXXXXXX',
            profile: {display_name: 'user1'},
          },
          {
            id: 'YYYYYYYYY',
            profile: {display_name: 'user2'},
          },
          {
            id: 'ZZZZZZZZZ',
            profile: {display_name: 'user3'},
          },
        ],
      }),
    },
  };
  await doAnswer((web as any) as WebClient, 'channel');
  expect(fn).toHaveBeenLastCalledWith({
    channel: 'channel',
    text: expect.stringMatching(/(:crown:user2)[\s\S]+(:zap:user1)/),
  });
});
