import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function callsIn(file, callee) {
  const code = await readFile(new URL(`../src/pages/${file}.jsx`, import.meta.url), 'utf8');
  const source = ts.createSourceFile(`${file}.jsx`, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const calls = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === callee) calls.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return calls;
}

const targets = calls => calls.map(call => call.arguments[0]?.text);
const replacesHistory = call => call.arguments[1]?.properties?.some(property =>
  property.name?.text === 'replace' && property.initializer?.kind === ts.SyntaxKind.TrueKeyword);

test('password sign-in opens Inicio without retaining the login page in history', async () => {
  const calls = await callsIn('Login', 'navigate');
  assert.deepEqual(targets(calls), ['/inicio']);
  assert.ok(replacesHistory(calls[0]));
});

test('confirmed registration opens Inicio and preserves the return-to-login action', async () => {
  const calls = await callsIn('Register', 'navigate');
  assert.deepEqual(targets(calls), ['/inicio', '/login']);
  assert.ok(replacesHistory(calls[0]));
});

test('confirmation success and measurement timeout both open Inicio', async () => {
  const calls = await callsIn('ConfirmRegistration', 'navigate');
  assert.deepEqual(targets(calls), ['/inicio', '/inicio']);
  assert.ok(calls.every(replacesHistory));
});

test('Google sign-in retains campaign attribution and registration retains confirmation', async () => {
  assert.deepEqual(targets(await callsIn('Login', 'campaignAnalytics.registrationUrl')), ['/inicio']);
  assert.deepEqual(targets(await callsIn('Register', 'campaignAnalytics.registrationUrl')), ['/auth/confirm', '/auth/confirm']);
});

test('password recovery still returns to login, not the home screen', async () => {
  assert.deepEqual(targets(await callsIn('ResetPassword', 'navigate')), ['/login']);
});
