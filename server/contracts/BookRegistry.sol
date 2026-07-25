// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BookRegistry — AI 阅读伴侣书包存证（Injective EVM）
/// @notice 记录用户上传书包的 SHA-256 指纹 + 元信息，作为不可篡改的上传存证。
///         由后端服务钱包代签写入（onlyOwner），任何人可公开查询验证。
contract BookRegistry {
    struct Book {
        bytes32 hash;       // 书包文件 SHA-256
        string  title;      // 书名
        string  author;     // 作者
        string  uploader;   // 上传者用户名
        uint256 timestamp;  // 存证时间（区块时间）
    }

    address public owner;
    Book[] private _books;
    mapping(bytes32 => uint256) private _idByHash; // 1-based，0 表示未存证

    event BookRegistered(
        uint256 indexed id,
        bytes32 indexed hash,
        string title,
        string author,
        string uploader,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    /// @notice 存证一本书；同一指纹只能存证一次
    function register(
        bytes32 hash,
        string calldata title,
        string calldata author,
        string calldata uploader
    ) external onlyOwner returns (uint256 id) {
        require(hash != bytes32(0), "empty hash");
        require(_idByHash[hash] == 0, "already registered");
        _books.push(Book(hash, title, author, uploader, block.timestamp));
        id = _books.length;
        _idByHash[hash] = id;
        emit BookRegistered(id, hash, title, author, uploader, block.timestamp);
    }

    function isRegistered(bytes32 hash) external view returns (bool) {
        return _idByHash[hash] != 0;
    }

    function getByHash(bytes32 hash) external view returns (Book memory) {
        uint256 id = _idByHash[hash];
        require(id != 0, "not registered");
        return _books[id - 1];
    }

    function getById(uint256 id) external view returns (Book memory) {
        require(id >= 1 && id <= _books.length, "bad id");
        return _books[id - 1];
    }

    function count() external view returns (uint256) {
        return _books.length;
    }
}
