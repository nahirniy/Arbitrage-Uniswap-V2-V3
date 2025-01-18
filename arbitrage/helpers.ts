import { V3_POOL_FEE } from "./config";
import chalk from "chalk";

export const getAmountOutV2 = (amountIn: bigint, reserveIn: bigint, reserveOut: bigint) => {
	const amountInWithFee = amountIn * BigInt(997); // fee 0.3%
	const numerator = amountInWithFee * reserveOut;
	const denominator = reserveIn * BigInt(1000) + amountInWithFee;
	const amountOut = numerator / denominator;
	return amountOut;
}

export const getPriceFromV3 = (sqrtPriceX96: bigint, token0V3: string, tokenIn: string) => {
	const Q96 = BigInt(2 ** 96);
	const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
	const price = sqrtPrice * sqrtPrice;

	const priceV3 = tokenIn === token0V3 ? 1 / price : price;
	const formattedPrice = Number(priceV3.toFixed(8));

	return formattedPrice;
}

export const sqrtBigInt = (value: bigint) => {
	if (value < BigInt(0)) throw new Error("Negative value");
	if (value < BigInt(2)) return value;

	let x0 = value;
	let x1 = (value + BigInt(1)) / BigInt(2);
	while (x1 < x0) {
		x0 = x1;
		x1 = (value / x1 + x1) / BigInt(2);
	}
	return x0;
}

export const getPotentialProfit = (amountIn: bigint, amountOut: bigint) => {
	const formattedProfit = Number(((Number(amountOut) / 1e18) - (Number(amountIn) / 1e18)).toFixed(2));
	return formattedProfit;
}

export const getPriceFromV2 = (reserves: bigint[], token0V2: string, tokenIn: string) => {
	const reserveOne = token0V2 === tokenIn ? reserves[1] : reserves[0];
	const reserveTwo = token0V2 === tokenIn ? reserves[0] : reserves[1];

	const precision = BigInt(10 ** 18);
	const price = (reserveTwo * precision) / reserveOne;

	const formattedPrice = Number((Number(price) / 1e18).toFixed(8));
	return formattedPrice;
}

export const createQuoteParams = (amountIn: bigint, tokenIn: string, tokenOut: string) => {
	return {
		tokenIn: tokenIn,
		tokenOut: tokenOut,
		amountIn: amountIn,
		fee: V3_POOL_FEE,
		sqrtPriceLimitX96: 0,
	};
}

export const log = {
	start: (message: string) => console.log(chalk.white(`------------------------------ ${message} ------------------------------`)),
	success: (msg: string) => console.log(chalk.green("✅ " + msg)),
	error: (msg: string) => console.log(chalk.red("❌ " + msg)),
	info: (msg: string) => console.log(chalk.blue("✍️  " + msg)),
	warning: (msg: string) => console.log(chalk.yellow("⚠️  " + msg)),
};