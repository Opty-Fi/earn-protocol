// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// helper contracts
import { MultiCall } from "../../utils/MultiCall.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { VersionedInitializable } from "../../dependencies/openzeppelin/VersionedInitializable.sol";
import { IncentivisedERC20 } from "./IncentivisedERC20.sol";
import { Modifiers } from "../earn-protocol-configuration/contracts/Modifiers.sol";
import { VaultStorageV3 } from "./VaultStorage.sol";
import { EIP712Base } from "../../utils/EIP712Base.sol";

// libraries
import { Errors } from "../../utils/Errors.sol";

// interfaces
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";

/**
 * @title Vault contract inspired by AAVE V3's AToken.sol
 * @author opty.fi
 * @notice Implementation of the risk specific interest bearing vault
 */

contract VaultMigrator is
    VersionedInitializable,
    IncentivisedERC20,
    MultiCall,
    Modifiers,
    ReentrancyGuard,
    VaultStorageV3,
    EIP712Base
{
    /**
     * @dev The version of the Vault implementation
     */
    uint256 public constant opTOKEN_REVISION = 0x0;

    /**
     * @dev hash of the permit function
     */
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    //===Constructor===//

    /* solhint-disable no-empty-blocks */
    constructor(address _registry)
        public
        IncentivisedERC20(string(abi.encodePacked("opTOKEN_IMPL")), string(abi.encodePacked("opTOKEN_IMPL")))
        EIP712Base()
        Modifiers(_registry)
    {
        // Intentionally left blank
    }

    /**
     * @dev Initialize the vault
     * @param _registry The address of registry for helping get the protocol configuration
     */
    function initialize(address _registry) external virtual initializer {
        registryContract = IRegistry(_registry);
    }

    /* solhint-enable no-empty-blocks */

    //===External functions===//

    function adminCall(bytes[] memory _codes) external onlyGovernance {
        executeCodes(_codes, Errors.ADMIN_CALL);
    }

    function adminMint(address[] memory _accounts, uint256[] memory _amounts) external onlyGovernance {
        uint256 _count = _accounts.length;
        require(_count == _amounts.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _count; _i++) {
            _mint(_accounts[_i], _amounts[_i]);
        }
    }

    function adminBurn(address[] memory _accounts, uint256[] memory _amounts) external onlyGovernance {
        uint256 _count = _accounts.length;
        require(_count == _amounts.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _count; _i++) {
            _burn(_accounts[_i], _amounts[_i]);
        }
    }

    /* solhint-disable-next-line func-name-mixedcase */
    function _EIP712BaseId() internal view override returns (string memory) {
        return name();
    }

    /**
     * @inheritdoc EIP712Base
     */
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() public view override returns (bytes32) {
        uint256 __chainId;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            __chainId := chainid()
        }
        if (__chainId == _chainId) {
            return _domainSeparator;
        }
        return _calculateDomainSeparator();
    }

    /**
     * @inheritdoc EIP712Base
     */
    function nonces(address owner) public view override returns (uint256) {
        return _nonces[owner];
    }

    /* solhint-enable-next-line func-name-mixedcase */

    //===Internal pure functions===//

    /**
     * @inheritdoc VersionedInitializable
     */
    function getRevision() internal pure virtual override returns (uint256) {
        return opTOKEN_REVISION;
    }
}
