const test = require('node:test');
const assert = require('node:assert/strict');
const toCsv = require('../src/utils/toCsv');

test('CSV encoder includes union headers and escapes delimiters and quotes', () => {
  assert.equal(
    toCsv([{ name: 'Ali, Khan', note: 'Said "hello"' }, { name: 'Sara', extra: 'two\nlines' }]),
    'name,note,extra\r\n"Ali, Khan","Said ""hello""",\r\nSara,,"two\nlines"',
  );
});

test('CSV encoder neutralizes formula-like user text without changing numbers', () => {
  assert.equal(toCsv([{ name: '=2+2', amount: -10 }]), 'name,amount\r\n\'=2+2,-10');
});

test('CSV encoder returns empty output for an empty report', () => {
  assert.equal(toCsv([]), '');
});
