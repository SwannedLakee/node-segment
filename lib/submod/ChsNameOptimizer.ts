/**
 * 人名优化模块
 *
 * @author 老雷<leizongmin@gmail.com>
 * @version 0.1
 */

'use strict';

import { SubSModuleOptimizer } from '../mod';
import {
	DOUBLE_NAME_1,
	DOUBLE_NAME_2,
	FAMILY_NAME_1,
	FAMILY_NAME_2,
	SINGLE_NAME,
	SINGLE_NAME_NO_REPEAT,
} from '../mod/CHS_NAMES';
import { IDICT, IWord } from '../Segment';
import { EnumDictDatabase } from '@novel-segment/types';

/**
 * @todo 支援 XX氏
 */
export class ChsNameOptimizer extends SubSModuleOptimizer
{
	protected override _TABLE: IDICT<IWord>;

	override name = 'ChsNameOptimizer';

	override _cache()
	{
		super._cache();

		this._TABLE = this.segment.getDict('TABLE');

		this._BLACKLIST = this.segment.getDict(EnumDictDatabase.BLACKLIST_FOR_OPTIMIZER) || {};
	}

	isBlackList(nw: string)
	{
		return nw in this._BLACKLIST
	}

	isMergeable2(...words: string[])
	{
		let nw = words.join('');

		if (!this.isBlackList(nw))
		{
			return true;
		}

		return null;
	}

	isMergeable(word: IWord, nextword: IWord)
	{
		if (word && nextword)
		{
			let nw = word.w + nextword.w;

			/**
			 * 不合併存在於 BLACKLIST 內的字詞
			 */
			if (!this.isBlackList(nw))
			{
				return true;

				/*
				return {
					word,
					nextword,
					nw,
					bool: true,
				}
				*/
			}
		}

		return null;
	}

	/**
	 * 只有新詞屬於人名或未知詞時才會合併
	 */
	validUnknownNewWord<W extends string | string[]>(ws: W, cb?: (nw: string, ew: IWord, ws: W) => IWord | boolean | void)
	{
		let nw = typeof ws === 'string' ? ws : (ws as string[]).join('');
		let ew = this._TABLE[nw];

		if (!ew?.p || ew.p & this._POSTAG.A_NR)
		{
			let ret = cb?.(nw, ew, ws) ?? true

			if (ret)
			{
				return typeof ret === 'object' ? ret : (ew ?? true)
			}
		}
	}

	/**
	 * 姓
	 */
	isFamilyName(w: string)
	{
		return w in FAMILY_NAME_1 || w in FAMILY_NAME_2
	}

	/**
	 * 双字姓名
	 */
	isDoubleName(w1: string, w2: string)
	{
		return w1 in DOUBLE_NAME_1 && w2 in DOUBLE_NAME_2
	}

	isSingleNameRepeat(w1: string, w2: string)
	{
		return this.isSingleNameNoRepeat(w1) && this.isSingleName(w1) && w2 === w1
	}

	/**
	 * 单字姓名
	 */
	isSingleName(w1: string)
	{
		return w1 in SINGLE_NAME
	}

	/**
	 * 单字姓名 不重覆
	 */
	isSingleNameNoRepeat(w1: string)
	{
		return w1 in SINGLE_NAME_NO_REPEAT
	}

	isFirstName(w1: string, w2: string)
	{
		return this.isSingleNameRepeat(w1, w2)
			|| this.isDoubleName(w1, w2)
	}

	/**
	 * 对可能是人名的单词进行优化
	 *
	 * @param {array} words 单词数组
	 * @return {array}
	 */
	override doOptimize(words: IWord[]): IWord[]
	{
		//debug(words);
		const POSTAG = this._POSTAG;
		let i = 0;

		/* 第一遍扫描 */
		while (i < words.length)
		{
			let word = words[i];
			let nextword = words[i + 1];

			if (this.isMergeable(word, nextword) && this.validUnknownNewWord(word.w + nextword.w))
			{
				let nw = word.w + nextword.w;

				let nextword2 = words[i + 2];

				if (nextword2?.w?.length <= 2 && word.w !== '于' && !(nextword2.p & this._POSTAG.D_P) && this.isFamilyName(word.w) && this.isFirstName(nextword.w, nextword2.w) && !this.isBlackList(nw + nextword2.w))
				{

					this.sliceToken(words, i, 3, {
						w: nw + nextword2.w,
						p: POSTAG.A_NR,
						m: [word, nextword, nextword2],
					}, undefined, {
						[this.name]: 7,
					});

					i += 2;
					continue;
				}

				//debug(nextword);
				// 如果为  "小|老" + 姓
				if (
					(word.w === '小' || word.w === '老')
					&& this.isFamilyName(nextword.w)
				)
				{
					/*
					words.splice(i, 2, {
						w: word.w + nextword.w,
						p: POSTAG.A_NR,
						m: [word, nextword],
					});
					*/

					this.sliceToken(words, i, 2, {
						w: nw,
						p: POSTAG.A_NR,
						m: [word, nextword],
					}, undefined, {
						[this.name]: 1,
					});

					i++;
					continue;
				}

				// 如果是 姓 + 名（2字以内）
				if (this.isFamilyName(word.w)
					&& ((nextword.p & POSTAG.A_NR) > 0 && nextword.w.length <= 2))
				{
					/*
					words.splice(i, 2, {
						w: word.w + nextword.w,
						p: POSTAG.A_NR,
						m: [word, nextword],
					});
					*/

					this.sliceToken(words, i, 2, {
						w: nw,
						p: POSTAG.A_NR,
						m: [word, nextword],
					}, undefined, {
						[this.name]: 2,
					});

					i++;
					continue;
				}

				// 如果相邻两个均为单字且至少有一个字是未识别的，则尝试判断其是否为人名
				if (!word.p || !nextword.p)
				{
					if (this.isFirstName(word.w, nextword.w))
					{
						/*
						words.splice(i, 2, {
							w: word.w + nextword.w,
							p: POSTAG.A_NR,
							m: [word, nextword],
						});
						*/

						this.sliceToken(words, i, 2, {
							w: nw,
							p: POSTAG.A_NR,
							m: [word, nextword],
						}, undefined, {
							[this.name]: 3,
						});

						// 如果上一个单词可能是一个姓，则合并
						let preword = words[i - 1];
						if (preword?.w?.length
							&& this.isFamilyName(preword.w)
							&& this.isMergeable2(preword.w, word.w, nextword.w)
						)
						{
							let nw = preword.w + word.w + nextword.w;

							/*
							words.splice(i - 1, 2, {
								w: preword.w + word.w + nextword.w,
								p: POSTAG.A_NR,
								m: [preword, word, nextword],
							});
							*/

							this.sliceToken(words, i - 1, 2, {
								w: nw,
								p: POSTAG.A_NR,
								m: [preword, word, nextword],
							}, undefined, {
								[this.name]: 4,
							});

						}
						else
						{
							i++;
						}
						continue;
					}
				}

				// 如果为 无歧义的姓 + 名（2字以内） 且其中一个未未识别词
				if (this.isFamilyName(word.w)
					&& (!word.p || !nextword.p)

					/**
					 * 防止將標點符號當作名字的BUG
					 */
					&& !(word.p & POSTAG.D_W || nextword.p & POSTAG.D_W)
				)
				{
					//debug(word, nextword);
					/*
					words.splice(i, 2, {
						w: word.w + nextword.w,
						p: POSTAG.A_NR,
						m: [word, nextword],
					});
					*/

					this.sliceToken(words, i, 2, {
						w: nw,
						p: POSTAG.A_NR,
						m: [word, nextword],
					}, undefined, {
						[this.name]: 5,
					});
				}
			}

			// 移到下一个单词
			i++;
		}

		/* 第二遍扫描 */
		i = 0;
		while (i < words.length)
		{
			let word = words[i];
			let nextword = words[i + 1];
			if (this.isMergeable(word, nextword))
			{
				// 如果为 姓 + 单字名
				if (this.isFamilyName(word.w) && this.isSingleName(nextword.w))
				{
					/*
					words.splice(i, 2, {
						w: word.w + nextword.w,
						p: POSTAG.A_NR,
						m: [word, nextword],
					});
					*/

					let nw = word.w + nextword.w;
					let ew = this._TABLE[nw];

					/**
					 * 更改為只有新詞屬於人名或未知詞時才會合併
					 */
					if (!ew?.p || ew.p & POSTAG.A_NR)
					{
						this.sliceToken(words, i, 2, {
							w: nw,
							p: POSTAG.A_NR,
							m: [word, nextword],
						}, undefined, {
							[this.name]: 6,
							exists_word: ew,
						});

						i++;
						continue;
					}
				}
			}

			// 移到下一个单词
			i++;
		}

		return words;
	}
}

export const init = ChsNameOptimizer.init.bind(ChsNameOptimizer) as typeof ChsNameOptimizer.init;

export const type = ChsNameOptimizer.type;

export default ChsNameOptimizer;

