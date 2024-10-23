// contracts/WasteTracking.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract WasteTracking is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GENERATOR_ROLE = keccak256("GENERATOR_ROLE");
    bytes32 public constant TRANSPORTER_ROLE = keccak256("TRANSPORTER_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");

    struct Waste {
        uint256 id;
        string wasteType;
        string origin;
        uint256 weight;
        string hazardLevel;
        string handlingInstructions;
        uint256 timestamp;
        address currentHolder;
        address[] holdersHistory;
        bool isProcessed;
        string status;
    }

    uint256 public wasteCount = 0;
    mapping(uint256 => Waste) private wastes;

    event WasteCreated(
        uint256 indexed id,
        string wasteType,
        string origin,
        uint256 weight,
        string hazardLevel,
        string handlingInstructions,
        uint256 timestamp,
        address indexed currentHolder
    );

    event WasteTransferred(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event WasteProcessed(
        uint256 indexed id,
        address indexed processor,
        uint256 timestamp
    );

    event WasteStatusUpdated(
        uint256 indexed id,
        string status,
        uint256 timestamp
    );

    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AccessControl: Access denied");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(GENERATOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(TRANSPORTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PROCESSOR_ROLE, ADMIN_ROLE);
    }

    // Function to grant roles to accounts
    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        super.grantRole(role, account);
        emit RoleGranted(role, account, msg.sender);
    }

    // Function to create a new waste entry
    function createWaste(
        string memory _wasteType,
        string memory _origin,
        uint256 _weight,
        string memory _hazardLevel,
        string memory _handlingInstructions
    ) public onlyRole(GENERATOR_ROLE) whenNotPaused {
        require(bytes(_wasteType).length > 0, "Waste type is required");
        require(bytes(_origin).length > 0, "Origin is required");
        require(_weight > 0, "Weight must be greater than zero");
        require(bytes(_hazardLevel).length > 0, "Hazard level is required");
        require(bytes(_handlingInstructions).length > 0, "Handling instructions are required");

        wasteCount++;
        address;
        holdersHistory[0] = msg.sender;

        wastes[wasteCount] = Waste({
            id: wasteCount,
            wasteType: _wasteType,
            origin: _origin,
            weight: _weight,
            hazardLevel: _hazardLevel,
            handlingInstructions: _handlingInstructions,
            timestamp: block.timestamp,
            currentHolder: msg.sender,
            holdersHistory: holdersHistory,
            isProcessed: false,
            status: "Created"
        });

        emit WasteCreated(
            wasteCount,
            _wasteType,
            _origin,
            _weight,
            _hazardLevel,
            _handlingInstructions,
            block.timestamp,
            msg.sender
        );
    }

    // Function to transfer waste to another holder
    function transferWaste(uint256 _id, address _to)
        public
        onlyRole(TRANSPORTER_ROLE)
        whenNotPaused
    {
        require(wastes[_id].id != 0, "Waste does not exist");
        require(_to != address(0), "Invalid recipient address");
        require(
            wastes[_id].currentHolder == msg.sender,
            "Only current holder can transfer waste"
        );
        require(!wastes[_id].isProcessed, "Waste has already been processed");

        wastes[_id].currentHolder = _to;
        wastes[_id].holdersHistory.push(_to);
        wastes[_id].status = "In Transit";

        emit WasteTransferred(_id, msg.sender, _to, block.timestamp);
    }

    // Function for processors to mark waste as processed
    function processWaste(uint256 _id)
        public
        onlyRole(PROCESSOR_ROLE)
        whenNotPaused
    {
        require(wastes[_id].id != 0, "Waste does not exist");
        require(
            wastes[_id].currentHolder == msg.sender,
            "Only current holder can process waste"
        );
        require(!wastes[_id].isProcessed, "Waste has already been processed");

        wastes[_id].isProcessed = true;
        wastes[_id].status = "Processed";

        emit WasteProcessed(_id, msg.sender, block.timestamp);
    }

    // Function to update the status of waste
    function updateWasteStatus(uint256 _id, string memory _status)
        public
        onlyRole(TRANSPORTER_ROLE)
        whenNotPaused
    {
        require(wastes[_id].id != 0, "Waste does not exist");
        require(bytes(_status).length > 0, "Status is required");

        wastes[_id].status = _status;

        emit WasteStatusUpdated(_id, _status, block.timestamp);
    }

    // Function to retrieve waste details by ID
    function getWaste(uint256 _id)
        public
        view
        returns (
            uint256 id,
            string memory wasteType,
            string memory origin,
            uint256 weight,
            string memory hazardLevel,
            string memory handlingInstructions,
            uint256 timestamp,
            address currentHolder,
            bool isProcessed,
            string memory status
        )
    {
        require(wastes[_id].id != 0, "Waste does not exist");
        Waste memory w = wastes[_id];
        return (
            w.id,
            w.wasteType,
            w.origin,
            w.weight,
            w.hazardLevel,
            w.handlingInstructions,
            w.timestamp,
            w.currentHolder,
            w.isProcessed,
            w.status
        );
    }

    // Function to get the holders history of a waste item
    function getWasteHistory(uint256 _id)
        public
        view
        returns (address[] memory)
    {
        require(wastes[_id].id != 0, "Waste does not exist");
        return wastes[_id].holdersHistory;
    }

    // Function to retrieve all waste IDs held by a specific address
    function getWastesByHolder(address _holder)
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory tempList = new uint256[](wasteCount);
        uint256 counter = 0;
        for (uint256 i = 1; i <= wasteCount; i++) {
            if (wastes[i].currentHolder == _holder) {
                tempList[counter] = wastes[i].id;
                counter++;
            }
        }
        uint256[] memory result = new uint256[](counter);
        for (uint256 j = 0; j < counter; j++) {
            result[j] = tempList[j];
        }
        return result;
    }

    // Emergency stop functions
    function pauseContract() public onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpauseContract() public onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
