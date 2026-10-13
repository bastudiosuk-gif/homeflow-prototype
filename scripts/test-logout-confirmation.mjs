import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const body = source.match(/const signOutDemo = useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[\]\);/)?.[1];
assert.ok(body, 'Logout callback is present');
for (const accepted of [false, true]) {
  const mutations = [];
  const prompts = [];
  const context = {
    DEMO_SESSION_KEY: 'demo-session',
    window: {
      confirm: (message) => { prompts.push(message); return accepted; },
      localStorage: { removeItem: (key) => mutations.push(['remove', key]) },
      history: { replaceState: (...args) => mutations.push(['history', ...args]) },
      location: { pathname: '/homeflow-prototype/', search: '' },
      scrollTo: () => mutations.push(['scroll']),
    },
    setDemoAccessCode: (value) => mutations.push(['code', value]),
    setLoginError: (value) => mutations.push(['error', value]),
    setAccessView: (value) => mutations.push(['access', value]),
    setView: (value) => mutations.push(['view', value]),
  };
  vm.runInNewContext(`(function () {${body}})()`, context);
  assert.deepEqual(prompts, ['Are you sure you want to log out of HomeFlow?']);
  if (!accepted) assert.equal(mutations.length, 0, 'Cancel leaves session and page untouched');
  else {
    assert.deepEqual(mutations[0], ['remove', 'demo-session']);
    assert.ok(mutations.some(([kind, value]) => kind === 'access' && value === 'login'));
  }
}
console.log('Logout confirmation: Cancel preserves the session; OK signs out.');
