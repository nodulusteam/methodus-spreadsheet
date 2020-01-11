const path = require('path');
import { GoogleSpreadsheet } from '../GoogleSpreadsheet';
import { sheet_ids } from './config';
import creds from './service-account-creds';
const _ = require('lodash');



const docs: any = {};
Object.keys(sheet_ids).forEach(function (key) {
  docs[key] = new GoogleSpreadsheet(sheet_ids[key]);
});


function getSheetName() { return 'test sheet' + (+new Date()); }
Object.values(docs).forEach(async (doc: any) => {
  await doc.useServiceAccountAuth(creds);
});



(() => {
  return docs['private'].getInfo().catch((err: Error) => {
    console.error(err);
  }).then((data: any) => {
    console.error(data);

  })

})()


