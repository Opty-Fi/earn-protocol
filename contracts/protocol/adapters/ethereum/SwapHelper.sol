// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ISwapRouter } from "../../../interfaces/uniswap/ISwapRouter.sol";

//  helper contracts
import { Modifiers } from "../../earn-protocol-configuration/contracts/Modifiers.sol";

// libraries
import { BytesLib } from "../../../utils/BytesLib.sol";
import { Errors } from "../../../utils/Errors.sol";

contract SwapHelper is Modifiers {
    using BytesLib for bytes;
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    ISwapRouter public immutable SwapRouter;

    // solhint-disable-next-line var-name-mixedcase
    address public constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    // solhint-disable-next-line var-name-mixedcase
    constructor(address _registry, ISwapRouter _SwapRouter) public Modifiers(_registry) {
        SwapRouter = _SwapRouter;
    }

    // solhint-disable-next-line func-name-mixedcase
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

    function giveAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external onlyRiskOperator {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _tokensLen; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], uint256(-1));
        }
    }

    function removeAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external onlyRiskOperator {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _tokensLen; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], 0);
        }
    }
}
