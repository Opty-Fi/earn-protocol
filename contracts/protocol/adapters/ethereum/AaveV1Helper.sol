// SPDX-License-Identifier:MIT

pragma solidity =0.8.11;

//  interfaces
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import { IWETH } from "@optyfi/defi-legos/interfaces/misc/contracts/IWETH.sol";
import { ILendingPool } from "@optyfi/defi-legos/ethereum/aave/contracts/ILendingPool.sol";
import { IAaveV1Token } from "@optyfi/defi-legos/ethereum/aave/contracts/IAaveV1Token.sol";

contract AaveV1Helper {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    IWETH public immutable WETH;

    // solhint-disable-next-line var-name-mixedcase
    address public constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    /* solhint-disable no-empty-blocks*/
    constructor(IWETH _weth) {
        WETH = _weth;
    }

    /* solhint-enable no-empty-blocks*/

    // solhint-disable-next-line func-name-mixedcase
    function depositETH_AaveV1(
        address _lendingPool,
        address _lpToken,
        uint256 _amount
    ) external {
        uint256 _wethBalanceBefore = IERC20(address(WETH)).balanceOf(address(this));
        IERC20(address(WETH)).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _wethBalanceAfter = IERC20(address(WETH)).balanceOf(address(this));
        uint256 _actualAmount = _wethBalanceAfter - _wethBalanceBefore;
        WETH.withdraw(_actualAmount);
        uint256 _balanceBeforeLP = IERC20(_lpToken).balanceOf(address(this));
        ILendingPool(_lendingPool).deposit{ value: _actualAmount }(ETH, _actualAmount, uint16(0));
        uint256 _balanceAfterLP = IERC20(_lpToken).balanceOf(address(this));
        IERC20(_lpToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    // solhint-disable-next-line func-name-mixedcase
    function withdrawETH_AaveV1(address _lpToken, uint256 _amount) external {
        uint256 _lpTokenBalanceBefore = IERC20(_lpToken).balanceOf(address(this));
        IERC20(_lpToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _lpTokenBalanceAfter = IERC20(_lpToken).balanceOf(address(this));
        uint256 _actualAmount = _lpTokenBalanceAfter - _lpTokenBalanceBefore;
        uint256 _balanceBeforeETH = address(this).balance;
        IAaveV1Token(_lpToken).redeem(_actualAmount);
        uint256 _balanceAfterETH = address(this).balance;
        WETH.deposit{ value: _balanceAfterETH - _balanceBeforeETH }();
        IERC20(address(WETH)).safeTransfer(msg.sender, _balanceAfterETH - _balanceBeforeETH);
    }

    /* solhint-disable no-empty-blocks*/
    receive() external payable {}
    /* solhint-enable no-empty-blocks*/
}
