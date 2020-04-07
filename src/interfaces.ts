import { SpreadsheetWorksheet } from "./SpreadsheetWorksheet";

export class SheetInfo {
    constructor(data: SheetInfo) {
        this.id = data.id;
        this.title = data.title;
        this.worksheets = data.worksheets;

    }
    public id: string;
    public title: string;
    public worksheets: SpreadsheetWorksheet[];
}


export class PagingInfo {
    total: number = 0;
}

export interface Credentials {
    client_email: string;
    private_key: string;
}

export type WebResponse = { result: any, body: any };
export type ResponsePromise = Promise<WebResponse | undefined | boolean>;
