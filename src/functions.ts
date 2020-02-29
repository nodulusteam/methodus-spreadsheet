

export type Dictionary<T = any> = { [key: string]: T };

export function forceArray(val: any) {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    return [val];
}

export function xmlSafeValue(val: any) {
    if (val == null) return '';
    return String(val).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '&#10;')
        .replace(/\r/g, '&#13;');
}
export function xmlSafeColumnName(val: any) {
    if (!val) return '';
    return String(val).replace(/[\s_]+/g, '')
        .toLowerCase();
}


