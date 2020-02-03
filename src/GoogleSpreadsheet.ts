import request from 'request-promise';
import * as  http from 'http';
import * as  querystring from 'querystring';
import * as  _ from 'lodash';
const GoogleAuth = require('google-auth-library');
import { SpreadsheetRow } from './SpreadsheetRow';
import { forceArray, xmlSafeColumnName, xmlSafeValue } from './functions';
import { SpreadsheetWorksheet } from './SpreadsheetWorksheet';
import v1 from 'uuid/v1';
import { EventEmitter } from 'events';
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Z'];




const GOOGLE_FEED_URL = "https://content-sheets.googleapis.com/v4/spreadsheets/";
const GOOGLE_AUTH_SCOPE = ["https://spreadsheets.google.com/feeds"];

const REQUIRE_AUTH_MESSAGE = 'You must authenticate to modify sheet data';

export interface Credentials {
    client_email: string;
    private_key: string;
}
// The main class that represents a single sheet
// this is the main module.exports
export class GoogleSpreadsheet extends EventEmitter {
    google_auth: any;
    visibility = 'public';
    projection = 'values';
    auth_mode = 'anonymous';
    auth_client = new GoogleAuth();
    jwt_client: any;
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

        this.auth_client = new GoogleAuth();
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

    // deprecated username/password login method
    // leaving it here to help notify users why it doesn't work
    setAuth(username: string, password: string, cb: any) {
        return cb(new Error('Google has officially deprecated ClientLogin. Please upgrade this module and see the readme for more instrucations'))
    }

    async useServiceAccountAuth(creds: Credentials) {

        // if (typeof creds == 'string') {
        //     try {
        //         creds = require(creds);
        //     } catch (err) {
        //         throw (new Error(err));
        //     }
        // }
        this.jwt_client = new this.auth_client.JWT(creds.client_email, null, creds.private_key, GOOGLE_AUTH_SCOPE, null);
        await this.renewJwtAuth();
    }

    async renewJwtAuth() {
        return await new Promise((resolve, reject) => {
            this.auth_mode = 'jwt';
            this.jwt_client.authorize((err: Error, token: any) => {
                if (err) return reject(err);
                this.setAuthToken({
                    type: token.token_type,
                    value: token.access_token,
                    expires: token.expiry_date
                });
                resolve()
            });

        })

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

    // This method is used internally to make all requests
    async makeFeedRequest(url_params: any, method: string, query_or_data: any): Promise<{ result: any, body: string } | boolean | undefined> {

        let url = '';
        const headers: any = {};
        if (typeof (url_params) == 'string') {
            // used for edit / delete requests
            url = url_params;
        } else if (Array.isArray(url_params)) {
            //used for get and post requets
            // url_params.push(this.visibility, this.projection);
            url = GOOGLE_FEED_URL + url_params.join("/");
        }

        if (this.auth_mode === 'jwt') {
            // check if jwt token is expired
            if (this.google_auth && this.google_auth!.expires > +new Date()) {

            } else {
                await this.renewJwtAuth();
            };

            if (this.google_auth) {
                if (this.google_auth.type === 'Bearer') {
                    headers['Authorization'] = 'Bearer ' + this.google_auth.value;
                } else {
                    headers['Authorization'] = "GoogleLogin auth=" + this.google_auth;
                }
            }
        };


        headers['Gdata-Version'] = '4.0';
        if (method == 'POST' || method == 'PUT') {
            headers['content-type'] = 'application/json';
        }

        if (method == 'PUT' || method == 'POST' && url.indexOf('/batch') != -1) {
            headers['If-Match'] = '*';// v1();//'*';


        }

        if (method == 'GET' && query_or_data) {
            let query = "?" + querystring.stringify(query_or_data);
            // replacements are needed for using     structured queries on getRows
            query = query.replace(/%3E/g, '>');
            query = query.replace(/%3D/g, '=');
            query = query.replace(/%3C/g, '<');
            url += query;
        }

        try {
            let bufferBody;
            if (query_or_data && Object.keys(query_or_data).length) {
                bufferBody = Buffer.from(JSON.stringify(query_or_data));
            }
            const response = await request({
                resolveWithFullResponse: true,
                url: url,
                method: method,
                headers: headers,
                gzip: this.options.gzip !== undefined ? this.options.gzip : true,
                body: method == 'POST' || method == 'PUT' ? bufferBody : null
            });
            const body: any = response.body;
            if (body) {
                const bodyObject: any = JSON.parse(body);
                return ({ result: response, body: bodyObject });
            } else {
                return true;
            }


        } catch (err) {
            const bodyObject: any = JSON.parse(err.error);
            if (bodyObject.error.code === 401) {
                throw (new Error("Invalid authorization key."));
            } else if (err.statusCode >= 400) {
                const message = bodyObject.error.message;
                throw (new Error("HTTP error " + bodyObject.error.code + " (" + http.STATUS_CODES[bodyObject.error.code]) + ") - " + message);
            } else if (err.statusCode === 200) {
                throw (new Error("Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)"));
            }
            throw (err);
        }
    }



    // public API methods
    async getInfo() {
        //https://sheets.googleapis.com/v4/spreadsheets/spreadsheetId?&fields=sheets.properties //fields: 'sheets.properties'

        try {
            const response: any = await this.makeFeedRequest([this.ss_key], 'GET', {});


            const data = response.body;
            if (data === true) {
                throw new Error('No response to getInfo call');
            }
            const ss_data = {
                id: data.spreadsheetId,
                title: data.properties.title,
                worksheets: [] as any
            }

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
            throw error;
        }


    }

    // NOTE: worksheet IDs start at 1
    async removeWorksheet(sheetid: any) {
        const request = {
            "requests": [
                {
                    "deleteSheet": {
                        "sheetId": sheetid
                    }
                }
            ]
        }

        try {
            const data: any = await this.makeFeedRequest([`${this.ss_key}:batchUpdate`], 'POST', request);
            return data;
        } catch (error) {
            if (error.indexOf(`You can't remove all the sheets in a document`) < 0) {
                throw (error);
            }
        }

    }

    async addWorksheet(opts: any) {
        // make opts optional
        const defaults = {
            title: 'Worksheet ' + (+new Date()),  // need a unique title
            rowCount: 50,
            colCount: 20
        };

        opts = _.extend({}, defaults, opts);

        // if column headers are set, make sure the sheet is big enough for them
        if (opts.headers && opts.headers.length > opts.colCount) {
            opts.colCount = opts.headers.length;
        }

        const request = {
            "requests": [
                {
                    "addSheet": {
                        "properties": {
                            "title": opts.title,
                            "gridProperties": {
                                // "rowCount": 20,
                                // "columnCount": 12
                            },
                            "tabColor": opts.tabColor || {
                                "red": 1.0,
                                "green": 0.3,
                                "blue": 0.4
                            }
                        }
                    }
                }
            ]
        }


        const data: any = await this.makeFeedRequest([`${this.ss_key}:batchUpdate`], 'POST', request);
        const sheet = new SpreadsheetWorksheet(this, data.body.replies[0].addSheet.properties);
        this.worksheets = this.worksheets || [];
        this.worksheets[sheet.title] = sheet;
        await sheet.setHeaderRow(opts.headers);
        return sheet;
    }

    // async removeWorksheet(sheet_id: any) {
    //     if (!this.isAuthActive())
    //         throw new Error(REQUIRE_AUTH_MESSAGE);

    //     if (sheet_id instanceof SpreadsheetWorksheet) return await sheet_id.del();
    //     await this.makeFeedRequest(GOOGLE_FEED_URL + "worksheets/" + this.ss_key + "/private/full/" + sheet_id, 'DELETE', null);
    // }


    async getHeaderRow(worksheet_id: string, opts: any) {
        // the first row is used as titles/keys and is not included
        const response: any = await this.makeFeedRequest([this.ss_key, 'values', `${worksheet_id}!A1:Z1`], 'GET', {});
        const data = response.result;
        const entries = response.body.values;
        if (entries) {
            return new SpreadsheetRow(this, entries[0], worksheet_id, 0);
        } else {
            return new SpreadsheetRow(this, [], worksheet_id, 0);
        }
    }

    map: any = {};

    async getRows(worksheet_title: string, opts: any) {
        const query: any = {}
        const map: any = {};
        const rows: any = [];
        try {
            const worksheet_id = this.worksheets[worksheet_title] ? this.worksheets[worksheet_title].id : worksheet_title;
            // const worksheetName = this.info.worksheets[worksheet_id].title;
            const response: any = await this.makeFeedRequest([this.ss_key, 'values', `${worksheet_title}!A1:Z1000`], 'GET', query);
            const data = response.result;
            const entries = response.body.values;
            const objectTemplate: any = {};
            if (data === true) {
                throw (new Error('No response to getRows call'))
            }
            if (entries && entries.length > 0) {
                entries[0].forEach((key: string, index: number) => {
                    map[COLUMNS[index]] = key;
                    objectTemplate[key] = null;
                });

                entries.forEach((row_data: any, rowIndex: number) => {
                    if (rowIndex > 0) {
                        const clone = JSON.parse(JSON.stringify(objectTemplate));
                        entries[0].forEach((key: string, index: number) => {
                            clone[key] = row_data[index];
                        });
                        rows.push(new SpreadsheetRow(this, clone, worksheet_id, rowIndex));
                    }
                });
            }
        } catch (error) {
            console.error('Captured error at getRows ', error);

        }

        return rows;
    }

    async addRow(worksheet_id: string, data: any, headerRow: string[]) {

        const request = {
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
                                        "stringValue": data[field]
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
            const response: any = await this.makeFeedRequest([`${this.ss_key}:batchUpdate`], 'POST', request);
            this.emit('insert', { sheetId: worksheet_id });


            const result: any = response;

            const row = new SpreadsheetRow(this, data, worksheet_id, 0);
            return row;
        } catch (error) {
            console.error('Capured error at addRow', error);
            throw (new Error(error));
        }
    }





    async addRows(worksheet_id: string, data: any, headerRow: string[]) {

        const request = {
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
            const response: any = await this.makeFeedRequest([`${this.ss_key}:batchUpdate`], 'POST', request);
            this.emit('insert', { sheetId: worksheet_id });


            const result: any = response;

            const row = new SpreadsheetRow(this, data, worksheet_id, 0);
            return row;
        } catch (error) {
            console.error('Capured error at addRow', error);
            throw (new Error(error));
        }
    }




    async updateRow(worksheet_id: string, data: any, headerRow: string[], index: number): Promise<SpreadsheetRow> {
        const request = {
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
                                        "stringValue": data[field]
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
            const response: any = await this.makeFeedRequest([`${this.ss_key}:batchUpdate`], 'POST', request);
            this.emit('update', { sheetId: worksheet_id });


            const result: any = response;

            const row = new SpreadsheetRow(this, data, worksheet_id, 0);
            return row;
        } catch (error) {
            console.error('Capured error at addRow', error);
            throw (new Error(error));
        }
    }

    async removeRow(worksheet_id: number, index: number) {

        //find index for sheet
        this.info.worksheets.forEach((sheet: any, index: number) => {
            if (sheet.id === worksheet_id) {
                worksheet_id = sheet.data.sheetId;
            }
        });

        const request = {
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
            const response: any = await this.makeFeedRequest([`${this.ss_key}:batchUpdate`], 'POST', request);
            this.emit('delete', { sheetId: worksheet_id });
            const result: any = response;

        } catch (error) {
            console.error('Capured error at addRow', error);
            throw (new Error(error));
        }
    }



};