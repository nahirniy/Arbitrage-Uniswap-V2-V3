import { ethers } from "ethers";
import { getPriceFromV2, getPriceFromV3, log } from "./helpers";
import { calculateProfitV3ToV2 } from "./calculateProfit";
import { calculateProfitV2ToV3 } from "./calculateProfit";
import { getInitialData } from "./initialData";
import {
	TOKEN_IN,
	STEP_FOR_ARBITRAGE,
	MIN_AMOUNT_FOR_ARBITRAGE,
	MAX_AMOUNT_FOR_ARBITRAGE,
	DECREASE_STEP_FOR_ARBITRAGE,
} from "./config";

const getArbitrageOpportunity = async () => {
	const { reserves, sqrtPriceX96, token0V2, token1V2, token0V3, token1V3, quoter } = await getInitialData();

	const priceV2 = getPriceFromV2(reserves, token0V2, TOKEN_IN);
	const priceV3 = getPriceFromV3(sqrtPriceX96, token0V3, TOKEN_IN);

	if (priceV2 === priceV3) {
		log.error("No opportunity for arbitrage: price between v2 and v3 is the same");
		return;
	}

	const isV2First = priceV2 < priceV3; // if v2 price is less than v3 price, then arbitrage must be done from v2 to v3
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

		const currentProfit = isV2First
			? await calculateProfitV2ToV3(optimalAmountIn, reserves, token0V2, token1V2, token0V3, token1V3, quoter)
			: await calculateProfitV3ToV2(optimalAmountIn, reserves, token0V2, token1V2, token0V3, token1V3, quoter);

		if (currentProfit > maxProfit) {
			const formattedOptimalAmountIn = (Number(optimalAmountIn) / Number(precision)).toFixed(8);
			log.info(`Potential profit increased: ${currentProfit}$. Amount in must be: ${formattedOptimalAmountIn}`);

			maxProfit = currentProfit;
			optimalAmountIn = optimalAmountIn;
		}

		const bestRangeIsFound = !stepForArbitrageIsDecreased && currentProfit < maxProfit && currentProfit > 0;
		const bestOptimalAmountIsFound = stepForArbitrageIsDecreased && currentProfit < maxProfit && currentProfit > 0;

		if (bestRangeIsFound) {
			const bestOptimalAmountIn = (Number(optimalAmountIn - currentStepForArbitrage) / Number(precision)).toFixed(8);
			const currentOptimalAmountIn = (Number(optimalAmountIn) / Number(precision)).toFixed(8);

			log.success(`We found best range in optimal amount: ${bestOptimalAmountIn} - ${currentOptimalAmountIn}`);
			log.success(`Potential profit for this amount in ${bestOptimalAmountIn} = ${maxProfit}$`);
			log.info(`Step dercresing... Try to find better optimal amount in...`);

			stepForArbitrageIsDecreased = true;
			i -= stepForIteration;
			optimalAmountIn -= currentStepForArbitrage;

			stepForIteration = (stepForIteration * DECREASE_STEP_FOR_ARBITRAGE) / 100;
			currentStepForArbitrage = (currentStepForArbitrage * BigInt(DECREASE_STEP_FOR_ARBITRAGE)) / BigInt(100);
		} else if (bestOptimalAmountIsFound) {
			const bestOptimalAmountIn = (Number(optimalAmountIn - currentStepForArbitrage) / Number(precision)).toFixed(8);
			log.success(`Best optimal amount in for v3: ${bestOptimalAmountIn}`);

			break;
		}
	}

	if (maxProfit === 0) {
		log.warning("Potential profit is 0: No opportunity for arbitrage");
	} else {
		const formattedOptimalAmountIn = (Number(optimalAmountIn) / Number(precision)).toFixed(8);
		log.success(`Potential profit: ${maxProfit}$ with amount in: ${formattedOptimalAmountIn}`);
	}

	const endTimestamp = Date.now();
	const reportAboutTime = `Spend on looking for arbitrage opportunity: ${((endTimestamp - startTimestamp) / 1000 / 60).toFixed(
		2
	)} minutes`;

	log.info(reportAboutTime);
};

getArbitrageOpportunity();
