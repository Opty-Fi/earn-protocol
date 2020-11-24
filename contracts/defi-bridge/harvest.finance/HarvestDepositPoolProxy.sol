// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../interfaces/harvest.finance/IHarvestDeposit.sol";
import "../../interfaces/harvest.finance/IHarvestFarm.sol";
import "../../libraries/SafeERC20.sol";

contract HarvestDepositPoolProxy is IDepositPoolProxy {

    using SafeERC20 for IERC20;
    using SafeMath for uint;

    function deposit(address _liquidityPool, address _liquidityPoolToken, uint[] memory _amounts) public override returns(bool) {
        address _underlyingToken = _getUnderlyingToken(_liquidityPoolToken);
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(_amounts[0]));
        IHarvestDeposit(_liquidityPoolToken).deposit(_amounts[0]);

        // This commented code corresponds to including staking feature inside deposit function:

        // address _vaultFarm = 0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A;
        // IERC20(_liquidityPoolToken).safeApprove(_vaultFarm, uint(0));
        // IERC20(_liquidityPoolToken).safeApprove(_vaultFarm, IERC20(_vaultToken).balanceOf(address(this)));
        // IHarvestFarm(_vaultFarm).stake(IERC20(_vaultToken).balanceOf(address(this)));

        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }

    function withdraw(address[] memory, address _liquidityPool, address _liquidityPoolToken, uint _shares) public override returns(bool) {
        address _underlyingToken = _getUnderlyingToken(_liquidityPoolToken);
        // This commented code corresponds to including unstaking and getting rewards features inside withdraw function:

        // address _vaultFarm = 0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A;
        // address _farmToken = 0xa0246c9032bC3A600820415aE600c6388619A14D;
        // IHarvestFarm(_vaultFarm).exit();
        // IERC20(_farmToken).safeTransfer(msg.sender,IERC20(_farmToken).balanceOf(address(this)));
        // IHarvestDeposit(_vaultToken).withdraw(IERC20(_vaultToken).balanceOf(address(this)));

        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_shares);
        IHarvestDeposit(_liquidityPool).withdraw(_shares);
        IERC20(_underlyingToken).safeTransfer(msg.sender, IERC20(_underlyingToken).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address , address _liquidityPool, address _holder) public override view returns(uint) {
        uint b = IERC20(_liquidityPool).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(IHarvestDeposit(_liquidityPool).getPricePerFullShare()).div(1e18);
        }
        return b;
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
    
    function getLiquidityPoolToken(address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
}

// Harvest DAI vault and token = 0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C
// underlyingToken = ["0x6B175474E89094C44Da98b954EedeAC495271d0F"]
// amounts = ["15000000000000000000"]
// Harvest DAI farm = 0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A