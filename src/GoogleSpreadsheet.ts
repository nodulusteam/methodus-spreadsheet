const log = require('debug')('methodus:spreadsheet');
// import * as  http from 'http';
// import * as  querystring from 'querystring';
// import * as  _ from 'lodash';
import { GoogleAuth, JWTInput, JWT, UserRefreshClient } from 'google-auth-library';
import { SpreadsheetRow } from './SpreadsheetRow';
import { SpreadsheetWorksheet } from './SpreadsheetWorksheet';
import { EventEmitter } from 'events';
import { Dictionary, parseObjects, prepareObject } from './functions';
import { Injector, ClientConfiguration, ConfiguredServer } from '@methodus/server';
import { GoogleSheetContract } from './google-contracts';
import { Http } from '@methodus/platform-rest';
import { Credentials, SheetInfo, ResponsePromise } from './interfaces';
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Z'];




const GOOGLE_FEED_URL = "https://content-sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_AUTH_SCOPE = ["https://spreadsheets.google.com/feeds"];


@ClientConfiguration(GoogleSheetContract, Http, GOOGLE_FEED_URL)
class SetupServer extends ConfiguredServer {

}
new SetupServer();
// const REQUIRE_AUTH_MESSAGE = 'You must authenticate to modify sheet data';

// The main class that represents a single sheet
// this is the main module.exports
export class GoogleSpreadsheet extends EventEmitter {
    google_auth: any;
    visibility = 'public';
    projection = 'values';
    auth_mode = 'anonymous';
    auth_client = new GoogleAuth();
    jwt_client?: JWT | UserRefreshClient;
    options: any = {};

    ss_key: any;
    //rows: any = [];
    worksheets: { [key: string]: SpreadsheetWorksheet } = {};
    info: any;


    /**
     *
     */
    constructor(ss_key: string, auth_id?: string, options?: any) {
        super();
        this.ss_key = ss_key;

        this.auth_client = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/spreadsheets' });
        this.options = options || {};
        // auth_id may be null
        this.setAuthAndDependencies(auth_id);

        if (!ss_key) {
            throw new Error("Spreadsheet key not provided.");
        }
    }



    // Authentication Methods

    setAuthToken(auth_id: any) {
        if (this.auth_mode == 'anonymous') this.auth_mode = 'token';
        this.setAuthAndDependencies(auth_id);
    }

    async useServiceAccountAuth(creds: Credentials) {
        this.jwt_client = this.auth_client.fromJSON({
            client_email: creds.client_email,
            private_key: creds.private_key,
            GOOGLE_AUTH_SCOPE: GOOGLE_AUTH_SCOPE,
        } as JWTInput);
        await this.renewJwtAuth();
    }

    async renewJwtAuth() {
        this.auth_mode = 'jwt';
        const credentials = await (this.jwt_client as JWT).authorize();
        this.setAuthToken({
            type: credentials.token_type,
            value: credentials.access_token,
            expires: credentials.expiry_date
        });
    }

    isAuthActive() {
        return !!this.google_auth;
    }

    setAuthAndDependencies(auth: any) {
        this.google_auth = auth;
        if (!this.options.visibility) {
            this.visibility = this.google_auth ? 'private' : 'public';
        }
        if (!this.options.projection) {
            this.projection = this.google_auth ? 'full' : 'values';
        }
    }

    // // // This method is used internally to make all requests
    // // async makeFeedRequest(url_params: any, method: string, query_or_data: any): ResponsePromise {

    // //     let url = '';
    // //     const headers: any = {};
    // //     if (typeof (url_params) == 'string') {
    // //         // used for edit / delete requests
    // //         url = url_params;
    // //     } else if (Array.isArray(url_params)) {
    // //         //used for get and post requets
    // //         // url_params.push(this.visibility, this.projection);
    // //         url = GOOGLE_FEED_URL + url_params.join("/");
    // //     }

    // //     if (this.auth_mode === 'jwt') {
    // //         // check if jwt token is expired
    // //         if (!this.google_auth || this.google_auth.expires < +new Date()) {
    // //             await this.renewJwtAuth();
    // //         }

    // //         if (this.google_auth) {
    // //             if (this.google_auth.type === 'Bearer') {
    // //                 headers['Authorization'] = 'Bearer ' + this.google_auth.value;
    // //             } else {
    // //                 headers['Authorization'] = "GoogleLogin auth=" + this.google_auth;
    // //             }
    // //         }
    // //     }


    // //     headers['Gdata-Version'] = '4.0';
    // //     if (method == 'POST' || method == 'PUT') {
    // //         headers['content-type'] = 'application/json';
    // //     }

    // //     if (method == 'PUT' || method == 'POST' && url.indexOf('/batch') != -1) {
    // //         headers['If-Match'] = '*';// v1();//'*';
    // //     }

    // //     if (method == 'GET' && query_or_data) {
    // //         let query = "?" + querystring.stringify(query_or_data);
    // //         // replacements are needed for using     structured queries on getRows
    // //         query = query.replace(/%3E/g, '>');
    // //         query = query.replace(/%3D/g, '=');
    // //         query = query.replace(/%3C/g, '<');
    // //         url += query;
    // //     }

    // //     try {
    // //         // let bufferBody;
    // //         // if (query_or_data && Object.keys(query_or_data).length) {
    // //         //     bufferBody = Buffer.from(JSON.stringify(query_or_data));
    // //         // }
    // //         const response: any = {};

    // //         // //await request({
    // //         //     resolveWithFullResponse: true,
    // //         //     url: url,
    // //         //     method: method,
    // //         //     headers: headers,
    // //         //     gzip: this.options.gzip !== undefined ? this.options.gzip : true,
    // //         //     body: method == 'POST' || method == 'PUT' ? bufferBody : null
    // //         // }).promise();


    // //         const body: any = response.body;
    // //         if (body) {
    // //             const bodyObject: any = JSON.parse(body);
    // //             return ({ result: response, body: bodyObject });
    // //         } else {
    // //             return true;
    // //         }


    // //     } catch (err) {
    // //         const bodyObject: any = JSON.parse(err.error);
    // //         if (bodyObject.error.code === 401) {
    // //             throw (new Error("Invalid authorization key."));
    // //         } else if (err.statusCode >= 400) {
    // //             const message = bodyObject.error.message;
    // //             throw (new Error("HTTP error " + bodyObject.error.code + " (" + http.STATUS_CODES[bodyObject.error.code]) + ") - " + message);
    // //         } else if (err.statusCode === 200) {
    // //             throw (new Error("Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)"));
    // //         }
    // //         throw (err);
    // //     }
    // // }



    async getInfo(): Promise<SheetInfo> {

        try {
            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
            serviceContract.auth_mode = this.auth_mode;
            serviceContract.jwt_client = this.jwt_client;
            const response: any = await serviceContract.getInfo(this.ss_key);
            const data = response.result;
            if (data === true) {
                throw new Error('No response to getInfo call');
            }
            const ss_data: SheetInfo = new SheetInfo({
                id: data.spreadsheetId,
                title: data.properties.title,
                worksheets: [] as any
            });

            if (data.sheets) {
                data.sheets.forEach((ws_data: any) => {
                    ss_data.worksheets.push(new SpreadsheetWorksheet(this, ws_data));
                });
            }


            this.info = ss_data;
            ss_data.worksheets.forEach((sheet: any) => {
                this.worksheets[sheet.title] = sheet;

            })
            //this.worksheets = ss_data.worksheets;
            return ss_data;

        } catch (error) {
            log(error);
            throw error;
        }


    }

    // NOTE: worksheet IDs start at 1
    async removeWorksheet(sheetid: any): ResponsePromise {
        const webRequest = {
            "requests": [
                {
                    "deleteSheet": {
                        "sheetId": sheetid
                    }
                }
            ]
        }

        try {
            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
            const response = await serviceContract.batchUpdate(this.ss_key, webRequest)

            // const data: WebResponse = await this.makeFeedRequest([`${this.ss_key}:batchUpdate`], 'POST', webRequest) as WebResponse;
            return response.result;
        } catch (error) {

            if (error.indexOf(`You can't remove all the sheets in a document`) < 0) {
                console.error(error);
                throw (error);
            }
        }
        return;

    }

    async addWorksheet(opts: any): Promise<SpreadsheetWorksheet | undefined> {
        // make opts optional
        const defaults = {
            title: 'Worksheet ' + (+new Date()),  // need a unique title
            rowCount: 50,
            colCount: 20
        };

        opts = Object.assign({}, defaults, opts);

        // if column headers are set, make sure the sheet is big enough for them
        if (opts.headers && opts.headers.length > opts.colCount) {
            opts.colCount = opts.headers.length;
        }

        const webRequest = {
            "requests": [
                {
                    "addSheet": {
                        "properties": {
                            "title": opts.title,
                            "gridProperties": {

                            }
                        }
                    }
                }
            ]
        }

        const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);

        const response = await serviceContract.batchUpdate(this.ss_key, webRequest)
        if (response.result) {
            const workSheetdata: any = response.result;
            const sheet = new SpreadsheetWorksheet(this, workSheetdata.replies[0].addSheet.properties);
            this.worksheets = this.worksheets || [];
            this.worksheets[sheet.title] = sheet;
            return sheet;
        }
        return;
    }

    // async removeWorksheet(sheet_id: any) {
    //     if (!this.isAuthActive())
    //         throw new Error(REQUIRE_AUTH_MESSAGE);

    //     if (sheet_id instanceof SpreadsheetWorksheet) return await sheet_id.del();
    //     await this.makeFeedRequest(GOOGLE_FEED_URL + "worksheets/" + this.ss_key + "/private/full/" + sheet_id, 'DELETE', null);
    // }


    async getHeaderRow<Model>(worksheet_id: string): Promise<SpreadsheetRow<Model>> {

        const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
        const response = await serviceContract.getHeaderRow(this.ss_key, `${worksheet_id}!A1:Z1`)
        const entries = response.result.values;
        if (entries) {
            return new SpreadsheetRow<Model>(this, entries[0], worksheet_id, 0);
        } else {
            return new SpreadsheetRow<Model>(this, [], worksheet_id, 0);
        }
    }

    map: any = {};

    async getRows<Model>(worksheet_title: string): Promise<SpreadsheetRow<Model>[]> {
        const query: Dictionary = {}
        const map: Dictionary = {};
        const rows: SpreadsheetRow<Model>[] = [];
        try {
            const worksheet_id = this.worksheets[worksheet_title] ? this.worksheets[worksheet_title].id : worksheet_title;
            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract)
            // const worksheetName = this.info.worksheets[worksheet_id].title;
            const response: any = await serviceContract.getRows(this.ss_key, `${worksheet_title}!A1:Z1000`, query);
            const data = response.result;
            const entries = response.result.values;
            const objectTemplate: any = {};
            if (data === true) {
                throw (new Error('No response to getRows call'))
            }
            if (entries && entries.length > 0) {
                entries[0].forEach((key: string, index: number) => {
                    map[COLUMNS[index]] = key;
                    objectTemplate[key] = null;
                });

                entries.forEach((row_data: Dictionary, rowIndex: number) => {
                    if (rowIndex > 0) {
                        const clone = JSON.parse(JSON.stringify(objectTemplate));
                        entries[0].forEach((key: string, index: number) => {
                            clone[key] = row_data[index];
                            parseObjects(clone, key);
                        });
                        rows.push(new SpreadsheetRow<Model>(this, clone, worksheet_id, rowIndex));
                    }
                });
            }
        } catch (error) {
            console.error('Captured error at getRows ', error);

        }

        return rows;
    }


    async addRow<Model>(worksheet_id: string, data: Partial<Model>, headerRow: string[]): Promise<SpreadsheetRow<Model> | null> {

        const webRequest = {
            "requests": [
                {
                    "updateCells": {
                        "range": {

                            "sheetId": worksheet_id,
                            "startRowIndex": 0,
                            "endRowIndex": 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": 1000

                        },
                        "rows": [{
                            "values": headerRow.map((header) => {
                                return {
                                    "userEnteredValue": {
                                        "stringValue": header
                                    }
                                }
                            })
                        }],
                        "fields": "userEnteredValue"
                    },
                }
                ,
                {
                    "appendCells": {
                        "sheetId": worksheet_id,
                        "rows": [{
                            "values": headerRow.map((field: string) => {
                                return {
                                    "userEnteredValue": {
                                        "stringValue": (data as Dictionary)[field]
                                    }
                                }
                            })
                        }],
                        "fields": "userEnteredValue"
                    },
                }
            ],
            "includeSpreadsheetInResponse": false,
            "responseIncludeGridData": false
        }
        try {
            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
            const response = await serviceContract.batchUpdate(this.ss_key, webRequest);
            this.emit('insert', { sheetId: worksheet_id });
            if (response.result) {
                const row = new SpreadsheetRow<Model>(this, data, worksheet_id, 0);
                return row;
            }

        } catch (error) {
            console.error('Capured error at addRow', error);
            throw (new Error(error));
        }
        return null;
    }





    async addRows<Model>(worksheet_id: string, data: Partial<Model>[], headerRow: string[]): Promise<SpreadsheetRow<Model>> {

        const webRequest = {
            "requests": [
                {
                    "updateCells": {
                        "range": {

                            "sheetId": worksheet_id,
                            "startRowIndex": 0,
                            "endRowIndex": 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": 1000

                        },
                        "rows": [{
                            "values": headerRow.map((header) => {
                                return {
                                    "userEnteredValue": {
                                        "stringValue": header
                                    }
                                }
                            })
                        }],
                        "fields": "userEnteredValue"
                    },
                }
                , {
                    "appendCells": {
                        "sheetId": worksheet_id,
                        "rows": data.map((row: any) => {
                            return {
                                "values": headerRow.map((field) => {
                                    return {
                                        "userEnteredValue": {
                                            "stringValue": row[field]
                                        }
                                    };
                                })
                            }
                        }),
                        "fields": "userEnteredValue"
                    },
                }
            ],
            "includeSpreadsheetInResponse": false,
            "responseIncludeGridData": false
        }
        try {
            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
            await serviceContract.batchUpdate(this.ss_key, webRequest);
            this.emit('insert', { sheetId: worksheet_id });
            const row = new SpreadsheetRow<Model>(this, data, worksheet_id, 0);
            return row;
        } catch (error) {
            console.error('Capured error at addRows', error);
            throw (new Error(error));
        }
    }




    async updateRow<Model>(worksheet_id: string, data: Partial<Model>, headerRow: string[], index: number): Promise<SpreadsheetRow<Model>> {
        data = prepareObject(data);

        const webRequest = {
            "requests": [
                {
                    "updateCells": {
                        "range": {

                            "sheetId": worksheet_id,
                            "startRowIndex": 0,
                            "endRowIndex": 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": 1000

                        },
                        "rows": [{
                            "values": headerRow.map((header) => {
                                return {
                                    "userEnteredValue": {
                                        "stringValue": header
                                    }
                                }
                            })
                        }],
                        "fields": "userEnteredValue"
                    },
                }
                ,
                {
                    "updateCells": {
                        "range": {

                            "sheetId": worksheet_id,
                            "startRowIndex": index,
                            "endRowIndex": index + 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": 1000

                        },
                        "rows": [{
                            "values": headerRow.map((field: string) => {
                                return {
                                    "userEnteredValue": {
                                        "stringValue": (data as Dictionary)[field]
                                    }
                                }
                            })
                        }],
                        "fields": "userEnteredValue"
                    },
                }
            ],
            "includeSpreadsheetInResponse": false,
            "responseIncludeGridData": false
        }
        try {

            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
            await serviceContract.batchUpdate(this.ss_key, webRequest);
            this.emit('update', { sheetId: worksheet_id });
            debugger;
            Object.keys(data).forEach((key: string) => {
                parseObjects(data, key);
            });
            debugger;
            const row = new SpreadsheetRow<Model>(this, data, worksheet_id, 0);
            debugger;
            return row;
        } catch (error) {
            debugger;
            console.error('Capured error at updateRow', error);
            throw (new Error(error));
        }
    }

    async removeRow(worksheet_id: number, index: number): ResponsePromise {

        //find index for sheet
        this.info.worksheets.forEach((sheet: any) => {
            if (sheet.id === worksheet_id) {
                worksheet_id = sheet.data.sheetId;
            }
        });

        const webRequest = {
            "requests": [
                {
                    "deleteRange": {
                        "range": {

                            "sheetId": worksheet_id,
                            "startRowIndex": index,
                            "endRowIndex": Number(index) + 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": 1000

                        },
                        "shiftDimension": "ROWS"
                    },
                }

            ],
            "includeSpreadsheetInResponse": false,
            "responseIncludeGridData": false
        }
        try {

            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
            const response = await serviceContract.batchUpdate(this.ss_key, webRequest);
            this.emit('delete', { sheetId: worksheet_id });
            return response.result;

        } catch (error) {
            console.error('Capured error at removeRow', error);
            throw (new Error(error));
        }
    }




    async removeRows(worksheet_id: number, indices: number[]): ResponsePromise {
        //find index for sheet
        this.info.worksheets.forEach((sheet: any) => {
            if (sheet.id === worksheet_id) {
                worksheet_id = sheet.data.sheetId;
            }
        });

        const webRequest = {
            "requests":
                indices.map((index) => {
                    return {
                        "deleteRange": {
                            "range": {

                                "sheetId": worksheet_id,
                                "startRowIndex": index,
                                "endRowIndex": Number(index) + 1,
                                "startColumnIndex": 0,
                                "endColumnIndex": 1000

                            },
                            "shiftDimension": "ROWS"
                        },
                    }
                }),
            "includeSpreadsheetInResponse": false,
            "responseIncludeGridData": false
        }
        try {
            const serviceContract: GoogleSheetContract = Injector.get(GoogleSheetContract);
            const response = await serviceContract.batchUpdate(this.ss_key, webRequest);
            this.emit('delete', { sheetId: worksheet_id });
            return response.result;
        } catch (error) {
            console.error('Capured error at removeRows', error);
            throw (new Error(error));
        }
    }
}