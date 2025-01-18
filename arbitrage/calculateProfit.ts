import { ethers } from "ethers";
import { getPotentialProfit, getAmountOutV2, createQuoteParams } from "./helpers";
import { TOKEN_IN } from "./config";

export const calculateProfitV2ToV3 = async (
	optimalAmountIn: bigint,
	reserves: bigint[],
	token0V2: string,
	token1V2: string,
	token0V3: string,
	token1V3: string,
	quoter: ethers.Contract
) => {
	const tokenInV2 = TOKEN_IN;
	const tokenOutV2 = token0V2 === TOKEN_IN ? token1V2 : token0V2;

	const reserveIn = token0V2 === TOKEN_IN ? reserves[0] : reserves[1];
	const reserveOut = token0V2 === TOKEN_IN ? reserves[1] : reserves[0];
	const v2AmountOut = getAmountOutV2(optimalAmountIn, reserveIn, reserveOut);

	const tokenInV3 = tokenOutV2;
	const tokenOutV3 = token0V3 === tokenInV3 ? token1V3 : token0V3;

	const quoteParams = createQuoteParams(v2AmountOut, tokenInV3, tokenOutV3);
	const v3AmountOut = (await quoter.quoteExactInputSingle.staticCall(quoteParams))[0];

	const currentProfit = getPotentialProfit(optimalAmountIn, v3AmountOut);
	return currentProfit;
}

export const calculateProfitV3ToV2 = async (
	optimalAmountIn: bigint,
	reserves: bigint[],
	token0V2: string,
	token1V2: string,
	token0V3: string,
	token1V3: string,
	quoter: ethers.Contract
) => {
	const tokenInV3 = TOKEN_IN;
	const tokenOutV3 = token0V3 === TOKEN_IN ? token1V3 : token0V3;

	const quoteParams = createQuoteParams(optimalAmountIn, tokenInV3, tokenOutV3);
	const v3AmountOut = (await quoter.quoteExactInputSingle.staticCall(quoteParams))[0];

	const tokenInV2 = tokenOutV3;
	const reserveIn = token0V2 === tokenInV2 ? reserves[0] : reserves[1];
	const reserveOut = token0V2 === tokenInV2 ? reserves[1] : reserves[0];

	const v2AmountOut = getAmountOutV2(v3AmountOut, reserveIn, reserveOut);

	const currentProfit = getPotentialProfit(optimalAmountIn, v2AmountOut);
	return currentProfit;
}