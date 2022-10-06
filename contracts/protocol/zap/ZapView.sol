//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { IZapView } from "./IZapView.sol";
import { ISwapper } from "../optyfi-swapper/contracts/swap/ISwapper.sol";
import { ZapInternal } from "./ZapInternal.sol";

/**
 * @title ZapView
 * @author OptyFi
 */
contract ZapView is IZapView, ZapInternal {
    /**
     * @inheritdoc IZapView
     */
    function getSwapper() external view returns (ISwapper) {
        return _getSwapper();
    }

    /**
     * @inheritdoc IZapView
     */
    function getMerkleProof(address _vault) external view returns (bytes32[] memory) {
        return _getMerkleProof(_vault);
    }
}
