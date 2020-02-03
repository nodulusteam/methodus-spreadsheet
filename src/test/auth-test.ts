const path = require('path');

import { sheet_ids } from './config';
import creds from './service-account-creds';
const _ = require('lodash');
import faker from 'faker';
import { Sheet } from '../Sheet';


const docs: any = {};
Object.keys(sheet_ids).forEach(function (key) {
  docs[key] = new Sheet(sheet_ids[key], creds);
});



(async () => {

  const email = faker.internet.email();
  let results = await docs['private'].insert('default', { email });
  console.log('inserted', results);

  results = await docs['private'].query('default', (row: { email: string }) => {
    return row['email'] === email;
  });

  console.log('query', results.data);
  results.data[0].email = faker.internet.email();

  results = await docs['private'].updateBy('default', results.data[0], (row:any)=> row.data.email === email );
  console.log('update', results);

  results = await docs['private'].delete('default', results.data);
  console.log('delete', results);

  // docs['private'].info.worksheets.forEach(async (worksheet: SpreadsheetWorksheet) => {
  //   const removeResult = await docs['private'].doc.removeWorksheet(worksheet.id);
  // });
})()


