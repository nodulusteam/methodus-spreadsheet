import { xmlSafeColumnName, forceArray, xmlSafeValue } from "./functions";
let RowSpreadsheet: any = null;
export class SpreadsheetRow {
    data: any;
    _links: any

    /**
     *
     */
    constructor(spreadsheet: any, data: any) {
        RowSpreadsheet = spreadsheet;
        this.data = data;
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




    save(cb: any) {
        /*
        API for edits is very strict with the XML it accepts
        So we just do a find replace on the original XML.
        It's dumb, but I couldnt get any JSON->XML conversion to work reliably
        */

        var data_xml ='';// this['_xml'];
        // probably should make this part more robust?
        data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gsx='http://schemas.google.com/spreadsheets/2006/extended'>");
        Object.keys(self).forEach((key) => {
            if (key.substr(0, 1) != '_' && typeof ((this as any)[key] == 'string')) {
                data_xml = data_xml.replace(new RegExp('<gsx:' + xmlSafeColumnName(key) + ">([\\s\\S]*?)</gsx:" + xmlSafeColumnName(key) + '>'), '<gsx:' + xmlSafeColumnName(key) + '>' + xmlSafeValue((this as any)[key]) + '</gsx:' + xmlSafeColumnName(key) + '>');
            }
        });
        RowSpreadsheet.makeFeedRequest(this['_links']['edit'], 'PUT', data_xml, cb);
    }
    del(cb: any) {
        RowSpreadsheet.makeFeedRequest(this['_links']['edit'], 'DELETE', null, cb);
    }
}
