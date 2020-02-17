const path = require('path');

import { sheet_ids } from './config';
import creds from './service-account-creds';
const _ = require('lodash');
import faker from 'faker';
import { Sheet } from '../Sheet';
import { SpreadsheetRow } from '../SpreadsheetRow';
import { SpreadsheetWorksheet } from '../SpreadsheetWorksheet';

class SheetModel {
  email?: string;
}

const docs: { [key: string]: Sheet } = {};
Object.keys(sheet_ids).forEach(function (key) {
  docs[key] = new Sheet(sheet_ids[key], creds);
});



(async () => {

  const email = faker.internet.email();
  let results = await docs['private'].insert('default', { email });
  console.log('inserted', results);

  results = await docs['private'].query<SheetModel>('default', (row: SpreadsheetRow<SheetModel>) => {
    return row.data['email'] === email
  });

  console.log('query', results.data);


  results = await docs['private'].updateBy<SheetModel>('default', { email: faker.internet.email() }, (row: SpreadsheetRow<SheetModel>) => {
    console.log(row.data.email, email, row.data.email === email);
    return row.data.email === email;
  });

  console.log('update', results);

  results = await docs['private'].delete('default', results.data[0]);
  console.log('delete', results);
  docs['private'].info?.worksheets.forEach(async (worksheet: SpreadsheetWorksheet, index: number) => {
    if (index > 0) {
      const removeResult = await docs['private'].doc.removeWorksheet(worksheet.id);
    }
  });
})()


