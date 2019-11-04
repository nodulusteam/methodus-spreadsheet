import request from 'request-promise';
import * as  xml2js from 'xml2js';
import * as  http from 'http';
import * as  querystring from 'querystring';
import * as  _ from 'lodash';
const GoogleAuth = require('google-auth-library');
import { SpreadsheetRow } from './SpreadsheetRow';
import { forceArray, xmlSafeColumnName, xmlSafeValue } from './functions';
import { SpreadsheetCell } from './SpreadsheetCell';
import { SpreadsheetWorksheet } from './SpreadsheetWorksheet';
import v1 from 'uuid/v1';


///12Wmxa8_scZ-np2rKs7lbWjyyIBdSRNMikwUGx_ZC_pY/values/A1%3AI1000


var GOOGLE_FEED_URL = "https://content-sheets.googleapis.com/v4/spreadsheets/";
var GOOGLE_AUTH_SCOPE = ["https://spreadsheets.google.com/feeds"];

var REQUIRE_AUTH_MESSAGE = 'You must authenticate to modify sheet data';

// The main class that represents a single sheet
// this is the main module.exports
export class GoogleSpreadsheet {
    google_auth: any;
    visibility = 'public';
    projection = 'values';
    auth_mode = 'anonymous';
    auth_client = new GoogleAuth();
    jwt_client: any;
    options: any = {};

    ss_key: any;
    //rows: any = [];
    worksheets: any;
    info: any;


    /**
     *
     */
    constructor(ss_key: string, auth_id?: string, options?: any) {

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

    async useServiceAccountAuth(creds: any) {
        if (typeof creds == 'string') {
            try {
                creds = require(creds);
            } catch (err) {
                throw (new Error(err));
            }
        }
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
            var query = "?valueInputOption=USER_ENTERED";
            url += query;

        }

        if (method == 'GET' && query_or_data) {
            var query = "?" + querystring.stringify(query_or_data);
            // replacements are needed for using structured queries on getRows
            query = query.replace(/%3E/g, '>');
            query = query.replace(/%3D/g, '=');
            query = query.replace(/%3C/g, '<');
            url += query;
        }

        try {
            const response = await request({
                resolveWithFullResponse: true,
                url: url,
                method: method,
                headers: headers,
                gzip: this.options.gzip !== undefined ? this.options.gzip : true,
                body: method == 'POST' || method == 'PUT' ? query_or_data : null
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
            var ss_data = {
                id: data.spreadsheetId,
                title: data.properties.title,
                worksheets: [] as any
            }

            data.sheets.forEach((ws_data: any) => {
                ss_data.worksheets.push(new SpreadsheetWorksheet(this, ws_data));
            });

            this.info = ss_data;
            this.worksheets = ss_data.worksheets;
            return ss_data;

        } catch (error) {
            debugger;
            throw error;
        }


    }

    // NOTE: worksheet IDs start at 1

    async addWorksheet(opts: any, cb: any) {
        // make opts optional
        if (typeof opts == 'function') {
            cb = opts;
            opts = {};
        }

        cb = cb || _.noop;

        if (!this.isAuthActive()) return cb(new Error(REQUIRE_AUTH_MESSAGE));

        var defaults = {
            title: 'Worksheet ' + (+new Date()),  // need a unique title
            rowCount: 50,
            colCount: 20
        };

        opts = _.extend({}, defaults, opts);

        // if column headers are set, make sure the sheet is big enough for them
        if (opts.headers && opts.headers.length > opts.colCount) {
            opts.colCount = opts.headers.length;
        }

        var data_xml = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006"><title>' +
            opts.title +
            '</title><gs:rowCount>' +
            opts.rowCount +
            '</gs:rowCount><gs:colCount>' +
            opts.colCount +
            '</gs:colCount></entry>';

        const data = await this.makeFeedRequest(["worksheets", this.ss_key], 'POST', data_xml);

        var sheet = new SpreadsheetWorksheet(self, data);
        this.worksheets = this.worksheets || [];
        this.worksheets.push(sheet);
        await sheet.setHeaderRow(opts.headers);
        return sheet;
    }

    async removeWorksheet(sheet_id: any) {
        if (!this.isAuthActive())
            throw new Error(REQUIRE_AUTH_MESSAGE);

        if (sheet_id instanceof SpreadsheetWorksheet) return await sheet_id.del();
        await this.makeFeedRequest(GOOGLE_FEED_URL + "worksheets/" + this.ss_key + "/private/full/" + sheet_id, 'DELETE', null);
    }


    async getHeaderRow(worksheet_id: string, opts: any) {
        // the first row is used as titles/keys and is not included
        const response: any = await this.makeFeedRequest([this.ss_key, 'values', `${worksheet_id}!A1:Z1`], 'GET', {});
        const data = response.result;
        const entries = response.body.values;
        return new SpreadsheetRow(this, entries[0]);
    }


    async getRows(worksheet_id: string, opts: any) {
        // the first row is used as titles/keys and is not included
        var query: any = {}

        // if (opts.offset) query["start-index"] = opts.offset;
        // else if (opts.start) query["start-index"] = opts.start;

        // if (opts.limit) query["max-results"] = opts.limit;
        // else if (opts.num) query["max-results"] = opts.num;

        // if (opts.orderby) query["orderby"] = opts.orderby;
        // if (opts.reverse) query["reverse"] = 'true';

        // if (opts.query) {
        //     //create a filter for the query
        //     const filterREquest = {
        //         "requests": [
        //             {
        //                 "filter": {
        //                     {
        //                 "criteria": {
        //                     string: {
        //                         object(FilterCriteria)
        //                     },

        //                 }

        //             }


        //         ],
        //         "includeSpreadsheetInResponse": true,
        //         "responseIncludeGridData": true
        //     }
        //     const response: any = await this.makeFeedRequest([this.ss_key, 'batchUpdate'], 'POST', query);
        // }
        // if (opts.query) query['sq'] = opts.query;

        const rows: any = [];
        try {
            const response: any = await this.makeFeedRequest([this.ss_key, 'values', `${worksheet_id}!A1:Z2000`], 'GET', query);
            console.error('Captured response at getRows ', response);
            const data = response.result;
            const entries = response.body.values;
            const objectTemplate: any = {};
            entries[0].forEach((key: string) => {
                objectTemplate[key] = null;
            });
            //, (err: Error, data: any, xml: any) => {
            //   if (err) return cb(err);
            if (data === true) {
                throw (new Error('No response to getRows call'))
            }
            entries.forEach((row_data: any, rowIndex: number) => {
                if (rowIndex > 0) {
                    const clone = JSON.parse(JSON.stringify(objectTemplate));
                    entries[0].forEach((key: string, index: number) => {
                        clone[key] = row_data[index];
                    });
                    rows.push(new SpreadsheetRow(this, clone));
                }
            });
        } catch (error) {
            console.error('Captured error at getRows ', error);

        }

        return rows;
    }

    async addRow(worksheet_id: string, data: any) {
        var data_xml = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' + "\n";
        Object.keys(data).forEach(function (key) {
            if (key != 'id' && key != 'title' && key != 'content' && key != '_links') {
                data_xml += '<gsx:' + xmlSafeColumnName(key) + '>' + xmlSafeValue(data[key]) +
                    '</gsx:' + xmlSafeColumnName(key) + '>' + "\n"
            }
        });
        data_xml += '</entry>';
        try {
            const result: any = await this.makeFeedRequest(["list", this.ss_key, worksheet_id], 'POST', data_xml)
            const new_xml = result.body;
            const entries_xml = new_xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
            const row = new SpreadsheetRow(this, data);
            return row;
        } catch (error) {
            console.error('Capured error at addRow', error);
            throw (new Error(error));
        }
    }

    async getCells(worksheet_id: string, opts: any) {


        // Supported options are:
        // min-row, max-row, min-col, max-col, return-empty
        var query = _.assign({}, opts);


        const response: any = await this.makeFeedRequest(["cells", this.ss_key, worksheet_id], 'GET', query);
        const data = response.result;
        if (data === true) {
            throw (new Error('No response to getCells call'))
        }

        var cells = [];
        var entries = forceArray(data['entry']);
        while (entries.length > 0) {
            cells.push(new SpreadsheetCell(this, this.ss_key, worksheet_id, entries.shift()));
        }

        return cells;
    }
};