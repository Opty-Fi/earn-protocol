// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyDepositPoolProxy.sol";
import "../../OptyRegistry.sol";
import "../../interfaces/harvest.finance/IHarvestDeposit.sol";
import "../../interfaces/harvest.finance/IHarvestFarm.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract OptyHarvestDepositPoolProxy is IOptyDepositPoolProxy,Modifiers {

    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using Address for address;

    OptyRegistry OptyRegistryContract;

    constructor(address _optyRegistry) public {
        setOptyRegistry(_optyRegistry);
    }

    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        OptyRegistryContract = OptyRegistry(_optyRegistry);
    }

    function deposit(address[] memory _underlyingTokens, address _vault, uint[] memory _amounts) public override returns(bool) {
        address _vaultToken = OptyRegistryContract.getLiquidityPoolToLPToken(_vault,_underlyingTokens);
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingTokens[0]).safeApprove(_vault, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(_vault, uint(_amounts[0]));
        IHarvestDeposit(_vault).deposit(_amounts[0]);
        IERC20(_vaultToken).safeTransfer(msg.sender, IERC20(_vaultToken).balanceOf(address(this)));
        return true;
    }

    function withdraw(address[] memory _underlyingTokens, address _vault, uint _shares) public override returns(bool) {
        address _vaultToken = OptyRegistryContract.getLiquidityPoolToLPToken(_vault, _underlyingTokens);
        IERC20(_vaultToken).safeTransferFrom(msg.sender,address(this),_shares);
        IHarvestDeposit(_vaultToken).withdraw(_shares);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address[] memory _underlyingTokens, address, address _vault, address _holder) public override view returns(uint) {
        address _vaultToken = OptyRegistryContract.getLiquidityPoolToLPToken(_vault,_underlyingTokens);
        uint b = IERC20(_vaultToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(IHarvestDeposit(_vault).getPricePerFullShare()).div(1e18);
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
}