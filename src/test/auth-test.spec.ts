import 'reflect-metadata';
import { GoogleSpreadsheet } from '../GoogleSpreadsheet';
import { sheet_ids } from './config';
import creds from './service-account-creds';
import { Credentials } from '../interfaces';

const _ = require('lodash');



const docs: { [key: string]: GoogleSpreadsheet } = {};

Object.keys(sheet_ids).forEach(function (key) {
  docs[key] = new GoogleSpreadsheet(sheet_ids[key], '', { encrypt: false });
});

describe('Authentication', () => {
  beforeAll(async () => {
    Object.values(docs).forEach(async (doc: GoogleSpreadsheet) => {
      await doc.useServiceAccountAuth(creds);
      const info = await doc.getInfo();
      for (const worksheet of info.worksheets) {
        if (worksheet.title !== 'test') {
          try {
            await doc.removeWorksheet(worksheet.id);
          } catch (error) {
            debugger;
          }
        }
      }
    });
  });

  describe('Test auth', () => {
    describe('getRows + getInfo', () => {
      jest.setTimeout(1000 * 60);
      test('getInfo should fail on a private doc', () => {
        return docs['private'].getInfo().catch((err: Error) => {
          expect(err.message).toContain('Request failed with status code 403');
        });
      });

      test('getRows should fail on a private doc', async () => {
        return docs['private'].getRows('test').catch((err: string) => {
          expect(err).toContain('The caller does not have permission');
        });
      });

      ['public', 'public-read-only'].forEach((key: string) => {
        test('reading should succeed on a ' + key + ' doc', async () => {
          jest.setTimeout(10 * 5000);
          const info = await docs[key].getInfo();
          expect(info.title).toBe(key);
        });
      });



    });
    describe('writing', () => {
      // it still fails on the public doc because you always need to auth
      _.each(['public', 'public-read-only', 'private'], (key: string) => {
        test('should fail on a ' + key + ' doc', async () => {
          try {
            const sheet = await docs[key].addWorksheet('test');
            return sheet;
          } catch (err) {

            expect(err.message).toContain('Request failed with status code 403');
          }
          return true;
        });
      });
    });

    describe('authentication', () => {
      test('should fail if the token is empty', async () => {
        try {
          await docs['private'].useServiceAccountAuth({} as Credentials);
        } catch (err) {
          expect(err).toBeDefined();
        }
      });



      test('should succeed if the creds are valid', async () => {
        let errorExist = false
        try {
          const auth = await docs['private'].useServiceAccountAuth(creds);
          return auth;
        } catch (error) {
          errorExist = true;
        }
        expect(errorExist).toBeFalsy();
      });
    });
  });
});