// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/opty/IOptyRegistry.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveSwap.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ICurveDAO.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../libraries/Addresses.sol";
import "../../libraries/SafeERC20.sol";
import "../../OptyRegistry.sol";

contract OptyCurvePoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    
    /**
    * @dev Opty Registry contract address must be hard-coded
    */
    address OptyRegistryAddress = address(0x0aE1B9eBF02D70CbE975263B4f014Da009A905a8);
    
    
    /**
    * @dev Mapping to store the number of different tokens that each pool has
    */
    mapping (address => uint) numberOfTokens;
    
    /**
    * @dev Mapping that associates LP token address to lendingPool address
    */
    mapping (address => address) LPToken;
    
    OptyRegistry OptyRegistryContract = OptyRegistry(OptyRegistryAddress);
    
    /**
     * @dev Returns the number of different tokens in _lendingPool
     * 
     * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
     * 
     * @return Address of the pool contract which handles _lendingPoolToken
     */ 
    function getPoolContract(address _lendingPoolToken) public view returns(address){
        return LPToken[_lendingPoolToken];
    }
    
    /**
    * @dev Sets _numberOfTokens in _lendingPool and store the key-value pair in numberOfTokens mapping
    * 
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    */
    function setLPTokenToPoolContract (address _lendingPool, address _lendingPoolToken) public returns(bool){
        LPToken[_lendingPoolToken] = _lendingPool;
        return true;
    }
    
    /**
    * @dev Reads a mapping to get the number of different tokens in _lendingPool
    * 
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * 
    * @return Number of different tokens in _lendingPool
    */ 
    function getNumberOfTokens(address _lendingPool) public view returns(uint){
        return numberOfTokens[_lendingPool];
    }
    
    /**
    * @dev Sets _numberOfTokens in _lendingPool and store the key-value pair in numberOfTokens mapping
    * 
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * @param _numberOfTokens Number of different tokens in the pool
    */
    function setLendingPoolToNumberOfTokens (address _lendingPool, uint _numberOfTokens) public returns(bool){
        numberOfTokens[_lendingPool] = _numberOfTokens;
        return true;
    }

    /**
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy(address _underlyingToken,address _lendingPool,address _lendingPoolToken,uint _amount) public override returns(bool){
        uint N_COINS = getNumberOfTokens(_lendingPool);
        if (N_COINS == uint(2)){
            deploy2(_underlyingToken, _lendingPool, _lendingPoolToken, _amount);
        }
        else if (N_COINS == uint(3)){
            deploy3(_underlyingToken, _lendingPool, _lendingPoolToken, _amount);
        }
        else if (N_COINS == uint(4)){
            deploy4(_underlyingToken, _lendingPool, _lendingPoolToken, _amount);
        }
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 2 tokens
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy2(address _underlyingToken,address _lendingPool,address _lendingPoolToken,uint _amount) internal returns(bool){
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_lendingPool);
        uint[2] memory amountsIn;
        for (uint i=0; i<uint(2); i++){
            if(tokensList[i] == _underlyingToken){
                amountsIn[i] = _amount;
                IERC20(tokensList[i]).safeApprove(_lendingPool, uint(0));
                IERC20(tokensList[i]).safeApprove(_lendingPool, _amount);
            }
            else{
                amountsIn[i] = uint(0);
                IERC20(tokensList[i]).safeApprove(_lendingPool, uint(0));
            }
        }
        uint minAmountOut = uint(0);
        ICurveDeposit(_lendingPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender,IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 3 tokens
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy3(address _underlyingToken,address _lendingPool,address _lendingPoolToken,uint _amount) internal returns(bool){
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_lendingPool);
        uint[3] memory amountsIn;
        for (uint i=0; i<uint(3); i++){
            if(tokensList[i] == _underlyingToken){
                amountsIn[i] = _amount;
                IERC20(tokensList[i]).safeApprove(_lendingPool, uint(0));
                IERC20(tokensList[i]).safeApprove(_lendingPool, _amount);
            }
            else{
                amountsIn[i] = uint(0);
                IERC20(tokensList[i]).safeApprove(_lendingPool, uint(0));
            }
        }
        uint minAmountOut = uint(0);
        ICurveDeposit(_lendingPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender,IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 4 tokens
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy4(address _underlyingToken,address _lendingPool,address _lendingPoolToken,uint _amount) internal returns(bool){
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_lendingPool);
        uint[4] memory amountsIn;
        for (uint i=0; i<uint(4); i++){
            if(tokensList[i] == _underlyingToken){
                amountsIn[i] = _amount;
                IERC20(tokensList[i]).safeApprove(_lendingPool, uint(0));
                IERC20(tokensList[i]).safeApprove(_lendingPool, _amount);
            }
            else{
                amountsIn[i] = uint(0);
                IERC20(tokensList[i]).safeApprove(_lendingPool, uint(0));
            }
        }
        uint minAmountOut = uint(0);
        ICurveDeposit(_lendingPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender,IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Swaps _amount of _lendingPoolToken for _underlyingToken
    * 
    * @param _underlyingToken Address of the token that the user wants to withdraw
    * @param _lendingPool Address of the pool deposit (or swap, in some cases) contract
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _lendingPoolToken to swap for _underlyingToken
    */
    function recall(address _underlyingToken, address _lendingPoolToken, uint _amount) public override returns(bool) {
        address lendingPool = getPoolContract(_lendingPoolToken);
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(lendingPool);
        uint8 N_COINS = uint8(tokensList.length);
        int128 i;
        for (uint8 j=0; j<N_COINS; j++){
            if(tokensList[j] == _underlyingToken){
                i = int128(j);
                break;
            }
        }
        uint minAmountOut = 0;
        IERC20(_lendingPoolToken).safeApprove(lendingPool, uint(0));
        IERC20(_lendingPoolToken).safeApprove(lendingPool, uint(_amount));
        ICurveDeposit(lendingPool).remove_liquidity_one_coin(_amount, i, minAmountOut, true);
        IERC20(_underlyingToken).safeTransfer(msg.sender, balance(_underlyingToken,address(this)));
        return true;
    }

    /** 
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
    *      the user's balance in _lendingPoolToken
    */
    function balanceInToken(address _lendingPoolToken, address _holder) public override view returns(uint){
        // Mantisa 1e18 to decimals
        uint b = balance(_lendingPoolToken,_holder);
        
        /**
        * TODO: Implement Curve calculations
        */
        
        return b;
    }
    
    /** 
    * @dev Returns the amount of _token that _holder has
    * 
    * @param _token Address of the ERC20 token of which the balance is read
    * @param _holder Address of which to know the balance
    */
    function balance(address _token,address _holder) public override view returns (uint) {
         return IERC20(_token).balanceOf(_holder);
    }
    
    /** 
    * @dev Deposits _amount of _lendingPoolToken in _lendingPoolGauge to generate CRV rewards
    * 
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    * @param _lendingPoolGauge Address of the gauge associated to the pool
    * @param _amount Quantity of _lendingPoolToken to deposit in the gauge

    */
    function stakeLPtokens(address _lendingPoolToken, address _lendingPoolGauge, uint _amount) public returns(bool){
        IERC20(_lendingPoolToken).safeApprove(_lendingPoolGauge, uint(0));
        IERC20(_lendingPoolToken).safeApprove(_lendingPoolGauge, uint(_amount));
        ICurveGauge(_lendingPoolGauge).deposit(_amount);
        return true;
    }
    
    /** 
    * @dev Withdraws _amount of _lendingPoolToken from _lendingPoolToken and claims CRV rewards
    * 
    * @param _lendingPoolToken Address of the token that represents users' holdings in the pool
    * @param _lendingPoolGauge Address of the gauge associated to the pool
    * @param _amount Quantity of _lendingPoolToken to withdraw from the gauge
    */
    function unstakeLPtokens(address _lendingPoolToken, address _lendingPoolGauge, uint _amount) public returns(bool){
        ICurveGauge(_lendingPoolGauge).withdraw(_amount);
        address tokenMinter = 0xd061D61a4d941c39E5453435B6345Dc261C2fcE0;
        ICurveDAO(tokenMinter).mint(_lendingPoolGauge);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, balance(_lendingPoolToken,address(this)));
        return true;
    }
}

// Curve Compound useful addresses:

// address _DAItoken = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
// address _USDCtoken = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
// address _CurveCompoundLPToken = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
// address _CurveCompoundDepositContract = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
// address _CurveCompoundGaugeContract = address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575);

// array dai-usdc = ["0x6B175474E89094C44Da98b954EedeAC495271d0F","0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]