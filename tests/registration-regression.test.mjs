import test from 'node:test';import assert from 'node:assert/strict';
import {createRegistration,confirmEmail,isValidPolishNip,normalizeEmail,normalizePhone} from '../js/registration-model.js';
const valid={companyName:'Firma Testowa',country:'PL',taxId:'5260250274',adminName:'Jan Test',email:' ADMIN@EXAMPLE.PL ',phone:'600 100 200',password:'bardzo-dobre-haslo',consent:true};
test('validates Polish NIP checksum',()=>{assert.equal(isValidPolishNip('526-025-02-74'),true);assert.equal(isValidPolishNip('5260250275'),false)});
test('normalizes login identifiers',()=>{assert.equal(normalizeEmail(valid.email),'admin@example.pl');assert.equal(normalizePhone(valid.phone,'PL'),'+48600100200')});
test('registration creates one company identity in trial_pending',()=>{const r=createRegistration(valid,new Date('2026-01-01T00:00:00Z'));assert.equal(r.taxId,'5260250274');assert.equal(r.licenseStatus,'trial_pending');assert.equal(r.trialStartedAt,null);assert.equal(r.status,'pending_email')});
test('email verification completes registration without starting trial',()=>{const r=createRegistration(valid);confirmEmail(r);assert.equal(r.status,'trial_pending');assert.equal(r.trialStartedAt,null)});

