import { xmlSafeColumnName, forceArray, xmlSafeValue } from "./functions";
let RowSpreadsheet: any = null;


export class SpreadsheetRow {
    data: any;
    _links: any;
    map: any = {};
    index: number;
    /**
     *
     */
    constructor(spreadsheet: any, data: any, rowIndex: number) {
        RowSpreadsheet = spreadsheet;
        this.data = data;
        this.index = rowIndex;
        // Object.keys(data).forEach((key, index) => {
        //     this.map[COLUMNS[index]] = key;
        // });

        //this._xml = xml;
        // const self: any = this as any;
        // Object.keys(data).forEach((key) => {
        //     var val = data[key];

        //     if (key.substring(0, 4) === "gsx:") {
        //         if (typeof val === 'object' && Object.keys(val).length === 0) {
        //             val = null;
        //         }
        //         if (key === "gsx:") {
        //             self[key.substring(0, 3)] = val;
        //         } else {
        //             self[key.substring(4)] = val;
        //         }
        //     } else {
        //         if (key == "id") {
        //             self[key] = val;
        //         } else if (val['_']) {
        //             self[key] = val['_'];
        //         } else if (key == 'link') {
        //             self['_links'] = [];
        //             val = forceArray(val);
        //             val.forEach((link: any) => {
        //                 self['_links'][link['$']['rel']] = link['$']['href'];
        //             });
        //         }
        //     }
        // });

    }




    async save(headerRow: any) {
        await RowSpreadsheet.updateRow(this.data, headerRow, this.index);
    }
    del(cb: any) {
        RowSpreadsheet.makeFeedRequest(this['_links']['edit'], 'DELETE', null, cb);
    }
}
