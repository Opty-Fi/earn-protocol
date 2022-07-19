// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';

import { DataTypes } from './DataTypes.sol';
import { ERC20Utils } from '../utils/ERC20Utils.sol';
import { ITokenTransferProxy } from '../utils/ITokenTransferProxy.sol';
import { SwapStorage } from './SwapStorage.sol';

/**
 * @title Contract for performing arbitrary swaps on DEXs
 * @author OptyFi
 */
abstract contract SwapInternal {
    /**
     * @notice executes a sequence of swaps via DEXs
     * @param _swapData the data for the swaps
     * @return receivedAmount the final amount of the toToken received
     */
    function _doSimpleSwap(DataTypes.SwapData memory _swapData)
        internal
        returns (uint256 receivedAmount)
    {
        //If source token is not ETH than transfer required amount of tokens
        //from sender to this contract
        _transferTokensFromProxy(
            _swapData.fromToken,
            _swapData.fromAmount,
            _swapData.permit
        );

        bytes memory _exchangeData = _swapData.exchangeData;

        for (uint256 i = 0; i < _swapData.callees.length; i++) {
            require(
                _swapData.callees[i] !=
                    address(SwapStorage.layout().tokenTransferProxy),
                'Cannot call TokenTransferProxy Contract'
            );

            {
                uint256 dataOffset = _swapData.startIndexes[i];
                bytes32 selector;
                assembly {
                    selector := mload(add(_exchangeData, add(dataOffset, 32)))
                }
                require(
                    bytes4(selector) != IERC20.transferFrom.selector,
                    'transferFrom not allowed for externalCall'
                );
                //add transfer check?
            }
            bool result = _externalCall(
                _swapData.callees[i], //destination
                _swapData.values[i], //value to send
                _swapData.startIndexes[i], // start index of call data
                _swapData.startIndexes[i + 1] - (_swapData.startIndexes[i]), // length of calldata
                _swapData.exchangeData // total calldata
            );
            require(result, 'External call failed');
        }

        receivedAmount = ERC20Utils.tokenBalance(
            _swapData.toToken,
            address(this)
        );

        require(
            receivedAmount >= _swapData.toAmount,
            'Received amount of tokens are less then expected'
        );

        ERC20Utils.transferTokens(
            _swapData.toToken,
            _swapData.beneficiary,
            receivedAmount
        );
    }

    /**
     * @notice checks whether swap may be executed
     * @param _swapData the parameters for the swap
     */
    function _canSwap(DataTypes.SwapData memory _swapData) internal view {
        //add values length check
        require(_swapData.deadline >= _timestamp(), 'Deadline breached');
        require(
            msg.value ==
                (
                    _swapData.fromToken == ERC20Utils.ethAddress()
                        ? _swapData.fromAmount
                        : 0
                ),
            'incorrect msg.value'
        );
        require(_swapData.toAmount > 0, 'toAmount is too low');
        require(
            _swapData.callees.length + 1 == _swapData.startIndexes.length,
            'Start indexes must be 1 greater than number of callees'
        );
    }

    /**
     * @dev Source take from GNOSIS MultiSigWallet
     * @dev https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWallet.sol
     */
    function _externalCall(
        address _destination,
        uint256 _value,
        uint256 _dataOffset,
        uint256 _dataLength,
        bytes memory _data
    ) internal returns (bool) {
        bool result = false;
        assembly {
            let x := mload(0x40) // "Allocate" memory for output
            // (0x40 is where "free memory" pointer is stored by convention)

            let d := add(_data, 32) // First 32 bytes are the padded length of data, so exclude that
            result := call(
                gas(),
                _destination,
                _value,
                add(d, _dataOffset),
                _dataLength, // Size of the input (in bytes) - this is what fixes the padding problem
                x,
                0 // Output is ignored, therefore the output size is zero
            )
        }
        return result;
    }

    /**
     * @notice performs a call to transfer tokens to this contract from msg.sender via TOKENTRANSFERPROXY
     * @param _token address to transfer
     * @param _amount of token to transfer
     * @param _permit ERC2612 permit
     */
    function _transferTokensFromProxy(
        address _token,
        uint256 _amount,
        bytes memory _permit
    ) internal {
        if (_token != ERC20Utils.ethAddress()) {
            ERC20Utils.permit(_token, _permit);
            ITokenTransferProxy(SwapStorage.layout().tokenTransferProxy)
                .transferFrom(_token, msg.sender, address(this), _amount);
        }
    }

    /**
     * @notice retrieves leftover tokens after swap
     * @param _token address of token to retrieve
     * @param _receiver address of receiver of tokens
     * @return balance the balance of _token to send to _receiver
     */
    function _retrieveTokens(address _token, address payable _receiver)
        internal
        returns (uint256 balance)
    {
        balance = ERC20Utils.tokenBalance(_token, address(this));
        ERC20Utils.transferTokens(_token, _receiver, balance);
    }

    /**
     * @notice returns address of the TokenTransferProxy
     * @param _l the layout of the swapper contract
     * @return tokenTransferProxy address
     */
    function _tokenTransferProxy(SwapStorage.Layout storage _l)
        internal
        view
        returns (address tokenTransferProxy)
    {
        tokenTransferProxy = _l.tokenTransferProxy;
    }

    /**
     * @notice returns the block timestamp
     * @return uint256 current block timestamp
     */
    function _timestamp() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}
