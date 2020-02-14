const path = require('path');
import faker from 'faker';
import { Sheet, getSheet, SheetDataResult } from '../Sheet';
import { sheet_ids } from './config';
import creds from './service-account-creds';
import { SpreadsheetWorksheet } from '../SpreadsheetWorksheet';
import { SpreadsheetRow } from '../SpreadsheetRow';

const _ = require('lodash');
const docs: { [key: string]: Sheet } = {};

class SheetModel {
  email?: string;
}

describe('Authentication', () => {
  beforeAll(() => {
    Object.keys(sheet_ids).forEach(function (key) {
      docs[key] = getSheet(sheet_ids[key], creds);
    });
  });

  describe('reading + getInfo', () => {
    test('getInfo should fail on a private doc', async () => {
      jest.setTimeout(1000 * 30)
      for (const sheet of Object.values(docs)) {
        try {
          const results = await sheet.query('test');
          expect(results).toBeDefined();

        } catch (error) {
          expect(false).toBeTruthy();
        }
      }
    });
  });

  describe('writing private doc', () => {
    const email = faker.internet.email();
    let insertedRow: any;
    let updatedRow: any;
    test('insert', async () => {
      const results = await docs['private'].insert('test', { email });
      insertedRow = results;
      expect(results).toBeDefined();
    });

    // test('insertMany', async () => {
    //   const rows = [{ email: faker.internet.email() }, { email: faker.internet.email() }, { email: faker.internet.email() }]
    //   const results = await docs['private'].insertMany('test', rows);
    //   expect(results).toBeDefined();
    // });

    test('update', async () => {
      insertedRow.email = faker.internet.email();
      updatedRow = await docs['private'].update('test', insertedRow);
      const results = await docs['private'].query('test');
      expect(updatedRow.data.email).toBe(insertedRow.email);
    });


    test('updateBy', async () => {


      const updatedResults = await docs['private'].query<SheetModel>('test', (row: SpreadsheetRow<SheetModel>) => row.data.email === insertedRow.email);
      const newEmail = faker.internet.email();
      const results: SheetDataResult<SheetModel> = await docs['private'].updateBy<SheetModel>('test', { email: newEmail },
        (row: SpreadsheetRow<SheetModel>) => {
          return row.data['email'] === updatedRow.data.email;
        });


      if (results.data) {
        expect(results.data[0].email).toBe(newEmail);
      } else {

        expect(true).toBeFalsy();
      }
    });

    test('remove from private doc', async () => {
      const results = await docs['private'].delete('test', insertedRow);
      expect(results).toBeDefined();
    });
  });

  afterAll(() => {
    Object.keys(sheet_ids).forEach(async (key) => {
      const info = docs[key].info;
      if (info) {
        info.worksheets.forEach(async (worksheet: SpreadsheetWorksheet) => {
          const removeResult = await docs[key].doc.removeWorksheet(worksheet.id);
        });
      }
    });
  });
});
