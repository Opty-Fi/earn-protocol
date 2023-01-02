// SPDX-License-Identifier:MIT

pragma solidity =0.8.11;

//  interfaces
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import { ISwapRouter } from "../../../interfaces/uniswap/ISwapRouter.sol";

// libraries
import { BytesLib } from "../../../utils/BytesLib.sol";

contract SwapHelper {
    using BytesLib for bytes;
    using SafeERC20 for IERC20;

    ISwapRouter public immutable SwapRouter;

    // solhint-disable-next-line var-name-mixedcase
    address public constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    constructor(ISwapRouter _SwapRouter) {
        SwapRouter = _SwapRouter;
    }

    function exactInput_UniswapV3(
        bytes memory _path,
        uint256 _deadline,
        uint256 _amountIn,
        uint256 _amountOutMinimum
    ) external {
        address _inputToken = _path.toAddress(0);
        uint256 _amountInBefore = IERC20(_inputToken).balanceOf(address(this));
        IERC20(_inputToken).safeTransferFrom(msg.sender, address(this), _amountIn);
        uint256 _amountInAfter = IERC20(_inputToken).balanceOf(address(this));
        SwapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: _path,
                recipient: msg.sender,
                deadline: _deadline,
                amountIn: _amountInAfter - _amountInBefore,
                amountOutMinimum: _amountOutMinimum
            })
        );
    }
}
