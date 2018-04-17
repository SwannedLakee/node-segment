/**
 * Created by user on 2018/4/16/016.
 */
import { SubSModule, SubSModuleOptimizer } from '../mod';
import { IWordDebug } from '../util';
/**
 * 自動處理 `里|后`
 *
 * @todo 發于余干松冲准呆只范舍涂
 */
export declare class ZhtSynonymOptimizer extends SubSModuleOptimizer {
    static readonly type: string;
    readonly type: string;
    doOptimize<T extends IWordDebug>(words: T[]): T[];
}
export declare const init: typeof SubSModule.init;
export default ZhtSynonymOptimizer;
