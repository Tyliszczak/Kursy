import {createCompany} from './license-model.js';
const KEY='kursy.license.distribution.v1';
export function loadStore(){try{return JSON.parse(localStorage.getItem(KEY))||seed()}catch{return seed()}}
export function saveStore(store){localStorage.setItem(KEY,JSON.stringify(store));}
export function seed(){return {companies:[createCompany({name:'Firma testowa',adminEmail:'admin@firma.test'})]};}
