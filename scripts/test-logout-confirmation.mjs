import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
assert.ok(!source.includes('window.confirm('));
assert.ok(source.includes('onCancel={() => setShowLogoutConfirmation(false)}'));
assert.ok(source.includes('onConfirm={completeSignOut}'));
assert.ok(source.includes('autoFocus onClick={onCancel}>Stay logged in'));
assert.ok(source.includes('{logoutConfirmation}'));
assert.ok(source.includes('dialog?.showModal()'));
const mutations = [];
const context = {
  DEMO_SESSION_KEY: 'demo-session',
  setShowLogoutConfirmation: (value) => mutations.push(['dialog', value]),
  window: {
    localStorage: { removeItem: (key) => mutations.push(['remove', key]) },
    history: { replaceState: () => {} },
    location: { pathname: '/', search: '' }, scrollTo: () => {},
  },
  setDemoAccessCode: () => {}, setLoginError: () => {}, setView: () => {},
  setAccessView: (value) => mutations.push(['access', value]),
};
const request = source.match(/const signOutDemo = useCallback\(\(\) => \{(.*?)\}, \[\]\);/)?.[1];
assert.ok(request);
vm.runInNewContext(`(function(){${request}})()`, context);
assert.deepEqual(mutations, [['dialog', true]], 'Request only opens dialog, session untouched');
const confirm = source.match(/const completeSignOut = useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[\]\);/)?.[1];
assert.ok(confirm);
vm.runInNewContext(`(function(){${confirm}})()`, context);
assert.ok(mutations.some(([kind, value]) => kind === 'remove' && value === 'demo-session'));
assert.ok(mutations.some(([kind, value]) => kind === 'access' && value === 'login'));
console.log('Branded logout: request preserves session, cancel dismisses, confirmation signs out.');
