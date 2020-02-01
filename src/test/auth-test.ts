const path = require('path');
import { GoogleSpreadsheet } from '../GoogleSpreadsheet';
import { sheet_ids } from './config';
import creds from './service-account-creds';
import { SpreadsheetWorksheet } from '../SpreadsheetWorksheet';
const _ = require('lodash');
import faker from 'faker';
import { Sheet } from '../Sheet';


const docs: any = {};
Object.keys(sheet_ids).forEach(function (key) {
  docs[key] = new Sheet(sheet_ids[key], creds);
});



(async () => {

  const email = faker.internet.email();
  const results = await docs['private'].insert(1, { email });
  docs['private'].info.worksheets.forEach(async (worksheet: SpreadsheetWorksheet) => {
    const removeResult = await docs['private'].doc.removeWorksheet(worksheet.id);
  });
})()


