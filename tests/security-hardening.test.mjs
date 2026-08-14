import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [backend,registration,registrationUi,driverApi,driverGate,driverApp,vehicles,driverHtml,mapEditor,companyHtml,companyApp]=await Promise.all([
  read('apps-script/Code.gs'),read('js/registration-api.js'),read('js/registration-ui.js'),read('js/license-cloud-api.js'),read('driver-app/access-gate.js'),read('driver-app/app.js'),read('driver-app/vehicles.js'),read('driver-app/index.html'),read('driver-app/map-editor.html'),read('company.html'),read('js/app-v2.js')
]);

test('rejestracja nie zawiera wysyłki ani potwierdzania SMS',()=>{
  for(const source of [backend,registration,registrationUi])assert.doesNotMatch(source,/sendSmsCode_|SMSAPI_TOKEN|verifyPhone|phoneCode/);
  assert.match(backend,/verifyEmail_[\s\S]*createSession_/);
});

test('link kierowcy jest jednorazowy, wygasa i jest wymieniany na sesję urządzenia',()=>{
  assert.match(backend,/activationExpiresAt/);
  assert.match(backend,/DriverSessions/);
  assert.match(backend,/activationTokenHash:''/);
  assert.match(backend,/createDriverSession_/);
  assert.match(backend,/revokeDriverSessions_/);
  assert.match(backend,/refreshDriverSession_/);
  assert.match(backend,/refreshTokenHash/);
  assert.match(backend,/absoluteExpiresAt/);
  assert.match(driverApi,/ensureDriverSession/);
  assert.match(driverApi,/saveDriverSession/);
  assert.match(driverGate,/history\.replaceState/);
  assert.doesNotMatch(driverApp,/driverRoutes\(DRIVER_CONTEXT\.activationToken/);
});

test('token kierowcy nie jest wysyłany w adresie GET',()=>{
  assert.doesNotMatch(vehicles,/activationToken=.*encodeURIComponent|companyId=.*driverId=/);
  assert.match(vehicles,/licenseCloudApi\.driverVehicles/);
  assert.doesNotMatch(vehicles,/fetch\(API_URL/);
});

test('potwierdzenie Stripe jest przypisane do sesji firmy i idempotentne',()=>{
  assert.match(backend,/required_\(p,\['sessionId','sessionToken'\]\)/);
  assert.match(backend,/payment\.status==='paid'/);
  assert.match(backend,/alreadyProcessed:true/);
  assert.match(backend,/subscriptions\//);
  assert.match(registration,/confirmCheckout:[\s\S]*sessionToken/);
});

test('mapy nie przechowują hasła i kontrolują integralność Leaflet',()=>{
  assert.doesNotMatch(mapEditor,/password|adminPassword|updateStop/);
  assert.match(driverHtml,/integrity="sha256-/);
  assert.match(driverHtml,/crossorigin="anonymous"/);
});

test('panel firmy unieważnia sesję podczas wylogowania',()=>{
  assert.match(companyHtml,/id="companyLogout"/);
  assert.match(companyApp,/registrationApi\.logout/);
  assert.match(backend,/function logout_/);
});

test('backend ogranicza żądania i neutralizuje formuły arkusza',()=>{
  assert.match(backend,/REQUEST_TOO_LARGE/);
  assert.match(backend,/function safeCell_/);
  assert.match(backend,/PASSWORD_PEPPER/);
  assert.match(backend,/REGISTRATION_BUSY/);
});
