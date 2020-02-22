import { sheet_ids } from './config';
import creds from './service-account-creds';
import faker from 'faker';
import { Sheet } from '../Sheet';
import { SpreadsheetRow } from '../SpreadsheetRow';
import { SpreadsheetWorksheet } from '../SpreadsheetWorksheet';

class SheetModel {
  email?: string;
  fields: any[] = [];
  keyid: string = '';
}

const docs: { [key: string]: Sheet } = {};
Object.keys(sheet_ids).forEach(function (key) {
  docs[key] = new Sheet(sheet_ids[key], creds);
});



(async () => {
  const email = faker.internet.email();
  let results = await docs['private'].insert('default', { email });
  console.log('inserted', results);

  const queryResults = await docs['private'].query<SheetModel>('default', (row: SpreadsheetRow<SheetModel>) => {
    return row.data['email'] === email
  });

  console.log('query', queryResults.data);

  const updatedObject = Object.assign({}, queryResults.data[0]);
  updatedObject.email = faker.internet.email();
  updatedObject.fields = [{ name: 'name1' }, { name: 'name2' }];

  console.log('updatedObject', updatedObject);
  results = await docs['private'].update<SheetModel>('default', updatedObject);
  console.log('update', results);

  const updateByResults = await docs['private'].updateBy<SheetModel>('default', { email: faker.internet.email() }, (row: SpreadsheetRow<SheetModel>) => {
    console.log(row.data.email, email, row.data.email === email);
    return row.data.email === email;
  });

  console.log('updateBy', updateByResults);

  results = await docs['private'].delete('default', queryResults.data[0]);
  console.log('delete', results);
  const worksheets = docs['private'].info!.worksheets;
  worksheets.forEach(async (worksheet: SpreadsheetWorksheet, index: number) => {
    if (index > 0) {
      const removeResult = await docs['private'].doc.removeWorksheet(worksheet.id);
      return removeResult;
    }
    return;
  });
})()


