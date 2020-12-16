# Aave V2 Position Migrator (USE AT YOUR OWN RISK!)

Deployed on mainnet at: 0x393E3512d45a956A628124665672312ea86930Ba [(View on Etherscan)](https://etherscan.io/address/0x393e3512d45a956a628124665672312ea86930ba)

Demo TX hash (ETH collateral & DAI borrow): 0x1dd6be694c494204ac2fca46a596f86c09db835bbcb8fc8eca3127a6dfb5e5d8 [(View on Etherscan)](https://etherscan.io/address/0x393e3512d45a956a628124665672312ea86930ba)

This is a project aimed at aspiring developers looking to learn to build atop great protocols like Aave. If you choose to use it, make sure
to follow the instructions below!

## Instructions
If you *choose* to use my migrator, please make sure you stick to the following steps. Remember, the code is unaudited and, despite my best efforts to
make it as hard as possible to lose funds, I can't guarantee anything. This is the wild west of DeFi, you need to know what you're doing!

There are essentially 3 steps you need to take to migrate:

1. **Approve** the migrator with your aToken(s).(I recommend an amount only slightly above your aToken balance, just to be safe.)
2. **Delegate** your chosen debtToken(s) credit to the migrator. (I recommend an amount only slightly above your borrows, just to be safe.)
3. **Migrate!**

(Recommended) 4. <b>Reset</b> your allowances to 0 (just good practice, I use [tac.dappstar.io](https://tac.dappstar.io/#/))

The migrator's "migrate" function takes the following three parameters:

1. **aTokens:** An address array of your approved aTokens.
2. **borrowReserves** An address array of the underlying reserves of your borrowed assets. **(Use the WETH address for ETH borrows)**
3. **rateModes** An array of uint256 values, representing the interest rate modes you intend to receive for each borrowed reserve. You must 
have delegated credit using the corresponding debtToken.

### Examples

#### Migrating ETH collateral with DAI borrow
You will need to...

1. Approve the migrator with your aETH.
2. Delegate your stable/variable debtDAI credit to the migrator.
3. Migrate with the following parameters:  
    I. aETH address  
    II. DAI address  
    III. 1 or 2 (1 to receive stable debt, 2 to receive variable debt)

There is no interface currently available (that I know of) that allows you to delegate your credit with a nice UI, so I used Etherscan.

All in all, you should be done in a few minutes! 

#### Migrating DAI collateral with ETH borrow
You will need to...

1. Approve the migrator with your aDAI.
2. Delegate your stable/variable debtWETH credit to the migrator.
3. Migrate with the following parameters:
    I. aDAI address  
    II. WETH address (remember, use the WETH address if you're migrating borrowed ETH)
    III. 1 or 2 (1 to receive stable debt, 2 to receive variable debt)
    
That's it! Let's go over one more, more complex example.

#### Migrating LEND and USDC collateral with DAI and WBTC borrows
You will need to...

1. Approve the migrator with your aLEND.
2. Approve the migrator with your aUSDC.
3. Delegate stable/variable debtDAI credit to the migrator.
4. Delegate stable/variable debtWBTC credit to the migrator.
5. Migrate with the following parameters:
    I. aLEND address, aUSDC address
    II. DAI address, WBTC address
    III. 1/2, 1/2 (1 to receive stable debt, 2 to receive variable debt)

That about wraps it up for examples, if you have any questions don't hesitate to reach out!

### Closing Remarks

Keep in mind that the more assets you have deposited/borrowed, the higher the gas limit will have to be.

Also, DO NOT send funds directly to the contract! The contract should *never* hold any funds whatsoever. If, by chance, you do end up sending tokens to it, let me know and I'll pull them out for you.

Lastly, and I cannot stress this enough, I am *not an expert.* Use the contract at your own risk. If you don't understand the code, I recommend waiting for the official migrator.

    
