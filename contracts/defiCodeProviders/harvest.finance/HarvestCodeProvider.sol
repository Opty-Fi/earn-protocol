// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/harvest.finance/IHarvestDeposit.sol";
import "../../interfaces/harvest.finance/IHarvestFarm.sol";
import "../../libraries/SafeERC20.sol";

contract HarvestCodeProvider is ICodeProvider {

    using SafeERC20 for IERC20;
    using SafeMath for uint;

    function getDepositCodes(address, address[] memory, address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        // This commented code corresponds to including staking feature inside deposit function:
        // address _vaultFarm = 0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A;
        // IERC20(_liquidityPoolToken).safeApprove(_vaultFarm, uint(0));
        // IERC20(_liquidityPoolToken).safeApprove(_vaultFarm, IERC20(_vaultToken).balanceOf(address(this)));
        // IHarvestFarm(_vaultFarm).stake(IERC20(_vaultToken).balanceOf(address(this)));
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("deposit(uint256)",_amounts[0]));
    }

    function getWithdrawCodes(address, address[] memory, address , address _liquidityPoolToken, uint _shares) public override view returns(bytes[] memory _codes) {
        // This commented code corresponds to including unstaking and getting rewards features inside withdraw function:
        // address _vaultFarm = 0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A;
        // address _farmToken = 0xa0246c9032bC3A600820415aE600c6388619A14D;
        // IHarvestFarm(_vaultFarm).exit();
        // IERC20(_farmToken).safeTransfer(msg.sender,IERC20(_farmToken).balanceOf(address(this)));
        // IHarvestDeposit(_vaultToken).withdraw(IERC20(_vaultToken).balanceOf(address(this)));

        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("withdraw(uint256)",_shares));
    }

    function balanceInToken(address _optyPool, address, address _liquidityPool, address) public override view returns(uint) {
        uint b = IERC20(_liquidityPool).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(IHarvestDeposit(_liquidityPool).getPricePerFullShare()).div(1e18);
        }
        return b;
    }
    
    function calculateAmountInToken(address ,address, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IHarvestDeposit(_liquidityPoolToken).getPricePerFullShare()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address, address, address _liquidityPoolToken,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(IHarvestDeposit(_liquidityPoolToken).getPricePerFullShare());
    }
    
    /** 
    * @dev Deposits _amount of _vaultToken in _vaultFarm to generate FARM rewards
    * 
    * @param _vaultToken Address of the token that represents users' holdings in the pool
    * @param _vaultFarm Address of the farm associated to the pool
    * @param _shares Quantity of _vaultToken to deposit in the farm
    */
    function stakeLPtokens(address _vaultToken, address _vaultFarm, uint _shares) public returns(bool){
        IERC20(_vaultToken).safeApprove(_vaultFarm, uint(0));
        IERC20(_vaultToken).safeApprove(_vaultFarm, uint(_shares));
        IERC20(_vaultToken).safeTransferFrom(msg.sender,address(this),_shares);
        IHarvestFarm(_vaultFarm).stake(_shares);
        return true;
    }
    
    /** 
    * @dev Withdraws _amount of _vaultToken from _vaultFarm and claims CRV rewards
    * 
    * @param _vaultToken Address of the token that represents users' holdings in the pool
    * @param _vaultFarm Address of the farm associated to the pool
    */
    function unstakeLPtokens(address _vaultToken, address _vaultFarm) public returns(bool){
        IHarvestFarm(_vaultFarm).exit();
        address farmToken = 0xa0246c9032bC3A600820415aE600c6388619A14D;
        IERC20(_vaultToken).safeTransfer(msg.sender, IERC20(_vaultToken).balanceOf(address(this)));
        IERC20(farmToken).safeTransfer(msg.sender, IERC20(farmToken).balanceOf(address(this)));
        return true;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IHarvestDeposit(_liquidityPool).underlying();
    }
    
    function _getUnderlyingToken(address _liquidityPoolToken) internal view returns(address) {
        return IHarvestDeposit(_liquidityPoolToken).underlying();
    }
    
    function getLiquidityPoolToken(address, address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
    
    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return false;
    }
    
     function getRewardToken(address , address , address , address ) public override view returns(address) {
         return address(0);
     }
}

// Harvest DAI vault and token = 0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C
// underlyingToken = ["0x6B175474E89094C44Da98b954EedeAC495271d0F"]
// amounts = ["15000000000000000000"]
// Harvest DAI farm = 0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A