// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

interface ILendToAaveMigrator {
    function migrateFromLEND(uint256 amount) external;
}