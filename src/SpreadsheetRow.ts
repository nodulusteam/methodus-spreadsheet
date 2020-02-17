import { xmlSafeColumnName, forceArray, xmlSafeValue } from "./functions";
let RowSpreadsheet: any = null;


export class SpreadsheetRow<Model> {
    data: Model;
    index: number;
    sheetId: string;
    /**
     *
     */
    constructor(spreadsheet: any, data: any, sheetId: string, rowIndex: number) {
        RowSpreadsheet = spreadsheet;
        this.sheetId = sheetId;
        this.data = data;
        this.index = rowIndex;

    }


    // async save(headerRow: any) {
    //     await RowSpreadsheet.updateRow(this.data, headerRow, this.index);
    // }
    async del() {

        await RowSpreadsheet.removeRow(this.sheetId, this.index);
    }
}
