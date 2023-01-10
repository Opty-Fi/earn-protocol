// SPDX-License-Identifier:MIT

pragma solidity =0.8.11;

//  interfaces
import { ICompound } from "@optyfi/defi-legos/ethereum/compound/contracts/ICompound.sol";
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import { IWETH } from "@optyfi/defi-legos/interfaces/misc/contracts/IWETH.sol";

contract CompoundHelper {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    IWETH public immutable WETH;

    // solhint-disable-next-line var-name-mixedcase
    constructor(IWETH _weth, IERC20 cETH) {
        WETH = _weth;
        cETH.safeApprove(address(cETH), type(uint256).max);
    }

    // solhint-disable-next-line func-name-mixedcase
    function calculateAmountInToken_Compound(address _liquidityPool, uint256 _liquidityPoolTokenAmount)
        external
        view
        returns (uint256)
    {
        return (_liquidityPoolTokenAmount * ICompound(_liquidityPool).exchangeRateStored()) / 1e18;
    }

    // solhint-disable-next-line func-name-mixedcase
    function calculateAmountInLPToken_Compound(address _liquidityPool, uint256 _depositAmount)
        external
        view
        returns (uint256)
    {
        return (_depositAmount * 1e18) / ICompound(_liquidityPool).exchangeRateStored();
    }

    // solhint-disable-next-line func-name-mixedcase
    function depositETH_Compound(address _liquidityPool, uint256 _amount) external {
        uint256 _wethBalanceBefore = IERC20(address(WETH)).balanceOf(address(this));
        IERC20(address(WETH)).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _wethBalanceAfter = IERC20(address(WETH)).balanceOf(address(this));
        uint256 _actualAmount = _wethBalanceAfter - _wethBalanceBefore;
        WETH.withdraw(_actualAmount);
        uint256 _balanceBeforeLP = IERC20(_liquidityPool).balanceOf(address(this));
        ICompound(_liquidityPool).mint{ value: _actualAmount }();
        uint256 _balanceAfterLP = IERC20(_liquidityPool).balanceOf(address(this));
        IERC20(_liquidityPool).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    // solhint-disable-next-line func-name-mixedcase
    function withdrawETH_Compound(address _liquidityPool, uint256 _amount) external {
        uint256 _lpTokenBalanceBefore = IERC20(_liquidityPool).balanceOf(address(this));
        IERC20(_liquidityPool).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _lpTokenBalanceAfter = IERC20(_liquidityPool).balanceOf(address(this));
        uint256 _actualAmount = _lpTokenBalanceAfter - _lpTokenBalanceBefore;
        uint256 _balanceBeforeETH = address(this).balance;
        ICompound(_liquidityPool).redeem(_actualAmount);
        uint256 _balanceAfterETH = address(this).balance;
        WETH.deposit{ value: _balanceAfterETH - _balanceBeforeETH }();
        IERC20(address(WETH)).safeTransfer(msg.sender, _balanceAfterETH - _balanceBeforeETH);
    }

    /* solhint-disable no-empty-blocks*/
    receive() external payable {}
    /* solhint-enable no-empty-blocks*/
}
