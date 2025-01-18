import { ethers } from "ethers";
import { quoterABI } from "../abis/Quoter";
import { pairV2Abi } from "../abis/PairV2";
import { poolV3Abi } from "../abis/PoolV3";
import { createQuoteParams, getAmountOutV2, getPotentialProfit, getPriceFromV3, log } from "./helpers";
import { PROVIDER, QUOTER_CONTRACT, V2_POOL_CONTRACT, V3_POOL_CONTRACT, TOKEN_IN, STEP_FOR_ARBITRAGE, MIN_AMOUNT_FOR_ARBITRAGE, MAX_AMOUNT_FOR_ARBITRAGE, DECREASE_STEP_FOR_ARBITRAGE } from "./config";
import { getPriceFromV2 } from "./helpers";

const getArbitrageOpportunity = async () => {
	const { reserves, sqrtPriceX96, token0V2, token1V2, token0V3, token1V3, quoter } = await getInitialData()

	const priceV2 = getPriceFromV2(reserves, token0V2, TOKEN_IN);
	const priceV3 = getPriceFromV3(sqrtPriceX96, token0V3, TOKEN_IN);

	if (priceV2 === priceV3) {
		log.error("No opportunity for arbitrage: price between v2 and v3 is the same");
		return;
	}

	const isV2First = priceV2 < priceV3;
	log.start(`Arbitrage must be done from ${isV2First ? "v2 to v3" : "v3 to v2"}`);


	const startTimestamp = Date.now();
	const precision = BigInt(10 ** 18);

	let currentStepForArbitrage = ethers.parseUnits(STEP_FOR_ARBITRAGE.toString(), 18);
	let optimalAmountIn = ethers.parseUnits(MIN_AMOUNT_FOR_ARBITRAGE.toString(), 18);
	
	let maxProfit = 0;
	let stepForIteration = STEP_FOR_ARBITRAGE;
	let stepForArbitrageIsDecreased = false;

	for (let i = 0; i < MAX_AMOUNT_FOR_ARBITRAGE; i += stepForIteration) {

		if (i !== 0) optimalAmountIn += currentStepForArbitrage;

		if (isV2First) {
			const currentProfit = await calculateProfitV2ToV3(optimalAmountIn, reserves, token0V2, token1V2, token0V3, token1V3, quoter);

			if (currentProfit > maxProfit) {
				log.info(`Potential profit increased: ${currentProfit}$. Amount in must be: ${optimalAmountIn}`);
				maxProfit = currentProfit;
				optimalAmountIn = optimalAmountIn;
			}

			const bestRangeIsFound = !stepForArbitrageIsDecreased && currentProfit < maxProfit && currentProfit > 0;
			const bestOptimalAmountIsFound = stepForArbitrageIsDecreased && currentProfit < maxProfit && currentProfit > 0;

			if (bestRangeIsFound) {
				const bestOptimalAmountIn = (optimalAmountIn - currentStepForArbitrage) / precision;
				const currentOptimalAmountIn = optimalAmountIn / precision;

				log.success(`We found best range in optimal amount for v2: ${bestOptimalAmountIn} - ${currentOptimalAmountIn}`);
				log.success(`Potential profit for this amount in ${bestOptimalAmountIn} = ${maxProfit}$`);
				log.info(`Step dercresing... Try to find better optimal amount in...`);

				stepForArbitrageIsDecreased = true;
				i -= stepForIteration;
				optimalAmountIn -= currentStepForArbitrage;
				
				stepForIteration = stepForIteration * DECREASE_STEP_FOR_ARBITRAGE / 100;
				currentStepForArbitrage = currentStepForArbitrage * BigInt(DECREASE_STEP_FOR_ARBITRAGE) / BigInt(100);
			} else if (bestOptimalAmountIsFound) {
				const bestOptimalAmountIn = (optimalAmountIn - currentStepForArbitrage) / precision;
				log.success(`Best optimal amount in for v3: ${bestOptimalAmountIn}`);

				break;
			}
		} else {
			const currentProfit = await calculateProfitV3ToV2(optimalAmountIn, reserves, token0V2, token1V2, token0V3, token1V3, quoter);

			if (currentProfit > maxProfit) {
				log.info(`Potential profit increased: ${currentProfit}$. Amount in must be: ${optimalAmountIn / precision}`);
				maxProfit = currentProfit;
				optimalAmountIn = optimalAmountIn;
			}

			const bestRangeIsFound = !stepForArbitrageIsDecreased && currentProfit < maxProfit && currentProfit > 0;
			const bestOptimalAmountIsFound = stepForArbitrageIsDecreased && currentProfit < maxProfit && currentProfit > 0;

			if (bestRangeIsFound) {
				const bestOptimalAmountIn = (optimalAmountIn - currentStepForArbitrage) / precision;
				const currentOptimalAmountIn = optimalAmountIn / precision;

				log.success(`We found best range in optimal amount for v3: ${bestOptimalAmountIn} - ${currentOptimalAmountIn}`);
				log.success(`Potential profit for this amount in ${bestOptimalAmountIn} = ${maxProfit}$`);
				log.info(`Step dercresing... Try to find better optimal amount in...`);

				stepForArbitrageIsDecreased = true;
				i -= stepForIteration;
				optimalAmountIn -= currentStepForArbitrage;
				
				stepForIteration = stepForIteration * DECREASE_STEP_FOR_ARBITRAGE / 100;
				currentStepForArbitrage = currentStepForArbitrage * BigInt(DECREASE_STEP_FOR_ARBITRAGE) / BigInt(100);
			} else if (bestOptimalAmountIsFound) {
				const bestOptimalAmountIn = (optimalAmountIn - currentStepForArbitrage) / precision;
				log.success(`Best optimal amount in for v3: ${bestOptimalAmountIn}`);

				break;
			}
		}
	}

	if (maxProfit === 0) log.warning("Potential profit is 0: No opportunity for arbitrage");

	const endTimestamp = Date.now();
	const reportAboutTime = `Spend on looking for arbitrage opportunity: ${((endTimestamp - startTimestamp) / 1000 / 60).toFixed(2)} minutes`;

	log.info(reportAboutTime);
};

getArbitrageOpportunity();


async function getInitialData() {
	const quoter = new ethers.Contract(QUOTER_CONTRACT, quoterABI, PROVIDER);
	const poolV2 = new ethers.Contract(V2_POOL_CONTRACT, pairV2Abi, PROVIDER);
	const poolV3 = new ethers.Contract(V3_POOL_CONTRACT, poolV3Abi, PROVIDER);

	const reserves = await poolV2.getReserves();
	const sqrtPriceX96 = (await poolV3.slot0())[0];
	const token0V2 = await poolV2.token0();
	const token1V2 = await poolV2.token1();
	const token0V3 = await poolV3.token0();
	const token1V3 = await poolV3.token1();

	return { reserves, sqrtPriceX96, token0V2, token1V2, token0V3, token1V3, quoter };
};

async function calculateProfitV2ToV3(
	optimalAmountIn: bigint,
	reserves: bigint[],
	token0V2: string,
	token1V2: string,
	token0V3: string,
	token1V3: string,
	quoter: ethers.Contract
) {
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
};

async function calculateProfitV3ToV2(
	optimalAmountIn: bigint,
	reserves: bigint[],
	token0V2: string,
	token1V2: string,
	token0V3: string,
	token1V3: string,
	quoter: ethers.Contract
) {
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
