// pages/api/openai-api.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type Message = {
  role: string;
  content: string;
};

type RequestData = {
  model: string;
  messages: Message[];
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { rawLogEvent, parserCode } = req.body;

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const apiURL = 'https://api.openai.com/v1/chat/completions';

  const prompt = `
  Raw log event:
  \`\`\`
  ${rawLogEvent}
  \`\`\`

  Log parser code:
  \`\`\`
  ${parserCode}
  \`\`\`
  `

  const requestData: RequestData = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: "You will be my assistant for testing Google Chronicle Logstash parsing code that I am writing. As my assistant, you will ask me for two inputs: The raw log event, and the log parser code. Once you have both inputs, you will help me understand the expected transformation into a UDM definition in JSON format and give me any suggestions or improvements to the code if necessary. You will not prompt me for any questions after you have given me the parsed output and suggestions. ",
      },
      {
        role: 'system',
        content: `
        Unified Data Model field list

        bookmark_border
        This document provides a list of fields available in the Unified Data Model schema. When specifying a field, use the following format: <prefix>.<field_name1>.<field_name2>.<...>.<field_nameN>=<value>
        
        When writing rules for Detect Engine, use the <prefix> pattern $event for Event fields and $entity for Entity fields. For example:
        
        \`\`\`
        $event.metadata.event_type
        $event.network.dhcp.opcode
        $event.principal.user.location.city
        $entity.graph.entity.hostname
        $entity.graph.metadata.product_name
        \`\`\`
        
        When writing configuration-based normalizer (CBN) parsers, use the <prefix> pattern event.idm.read_only_udm for UDM Event fields and event.idm.graph for UDM Entity fields. For example:
        
        \`\`\`
        event.idm.read_only_udm.metadata.event_type
        event.idm.read_only_udm.network.dhcp.opcode
        event.idm.read_only_udm.principal.user.location.city
        event.idm.graph.entity.user.user_display_name
        event.idm.graph.entity.asset.hostname
        \`\`\`
        
        Field name and field type values can look similar. This document uses style conventions to help you identify the differences:
        
        \`\`\`
        Field type values use CamelCase characters. For example, Platform and EventType.
        Field name values use lowercase characters. For example, platform and event_type.
        Standard datatype values use lowercase characters.
        \`\`\`
        
        UDM Entity data model
        
        Entity
        
        An Entity provides additional context about an item in a UDM event. For example, a PROCESS_LAUNCH event describes that user 'abc@example.corp' launched process 'shady.exe'. The event does not include information that user 'abc@foo.corp' is a recently-terminated employee who administers a server storing finance data. Information stored in one or more Entities can add this additional context.`
      },
      {
        role: 'system',
        content: `
        A Unified Data Model event.

        Type	Label	Description
        about	Noun	repeated	Represents entities referenced by the event that are not otherwise described in principal, src, target, intermediary or observer. For example, it could be used to track email file attachments, domains/URLs/IPs embedded within an email body, and DLLs that are loaded during a PROCESS_LAUNCH event.
        additional	google.protobuf.Struct		Any important vendor-specific event data that cannot be adequately represented within the formal sections of the UDM model.
        extensions	Extensions		All other first-class, event-specific metadata goes in this message. Do not place protocol metadata in Extensions; put it in Network.
        intermediary	Noun	repeated	Represents details on one or more intermediate entities processing activity described in the event. This includes device details about a proxy server, SMTP relay server, etc. If an active event (that has a principal and possibly target) passes through any intermediaries, they're added here. Intermediaries can impact the overall action, for example blocking or modifying an ongoing request. A rule of thumb here is that 'principal', 'target', and description of the initial action should be the same regardless of the intermediary or its action. A successful network connection from A->B should look the same in principal/target/intermediary as one blocked by firewall C: principal: A, target: B (intermediary: C).
        metadata	Metadata		Event metadata such as timestamp, source product, etc.
        network	Network		All network details go here, including sub-messages with details on each protocol (e.g., DHCP, DNS, HTTP, etc).
        observer	Noun		Represents an observer entity (for example, a packet sniffer or network-based vulnerability scanner), which is not a direct intermediary, but which observes and reports on the event in question.
        principal	Noun		Represents the acting entity that originates the activity described in the event. The principal must include at least one machine detail (hostname, MACs, IPs, port, product-specific identifiers like an EDR asset ID) or user detail (for example, username), and optionally include process details. It must NOT include any of the following fields: email, files, registry keys or values.
        security_result	SecurityResult	repeated	A list of security results.
        src	Noun		Represents a source entity being acted upon by the participant along with the device or process context for the source object (the machine where the source object resides). For example, if user U copies file A on machine X to file B on machine Y, both file A and machine X would be specified in the src portion of the UDM event.
        target	Noun		Represents a target entity being referenced by the event or an object on the target entity. For example, in a firewall connection from device A to device B, A is described as the principal and B is described as the target. For a process injection by process C into target process D, process C is described as the principal and process D is described as the target.`
      },
      {
        role: 'system',
        content: `
        Population of Noun metadata
In this section, the word Noun is a overarching term used to represent the entities; principal, src, target, intermediary, observer, and about. These entities have common attributes, but represent different objects in an event. For more information about entities and what each represents in an event, see Formatting log data as UDM.

Noun.asset_id
Purpose: Vendor-specific unique device identifier (for example, a GUID that is generated when installing endpoint security software on a new device that is used to track that unique device over time).
Encoding: VendorName.ProductName:ID where VendorName is a case insensitive* *vendor name like "Carbon Black", ProductName is a case insensitive product name, like "Response" or "Endpoint Protection", and ID is a vendor-specific customer identifier that is globally unique within their customer's environment (for example, a GUID or unique value identifying a unique device). VendorName and ProductName are alphanumeric and no more than 32 characters long. ID can be a maximum of 128 characters in length and can include alphanumeric characters, dashes, and periods.
Example: CrowdStrike.Falcon:0bce4259-4ada-48f3-a904-9a526b01311f
Noun.email
Purpose: Email address
Encoding: Standard email address format.
Example: johns@test.altostrat.com
Noun.file
Purpose: Detailed file metadata.
Type: Object
See Population of File metadata.
Noun.hostname
Purpose: Client hostname or domain name field. Do not include if a URL is present.
Encoding: Valid RFC 1123 hostname.
Examples:
userwin10
www.altostrat.com
Noun.platform
Purpose: Platform operating system.
Encoding: Enum
Possible Values:
LINUX
MAC
WINDOWS
UNKNOWN_PLATFORM
Noun.platform_patch_level
Purpose: Platform operating system patch level.
Encoding: Alphanumeric string with punctuation, 64 characters maximum.
Example: Build 17134.48
Noun.platform_version
Purpose: Platform operating system version.
Encoding: Alphanumeric string with punctuation, 64 characters maximum.
Example: Microsoft Windows 10 version 1803
Noun.process
Purpose: Detailed process metadata.
Type: Object
See Population of Process metadata.
Noun.ip
Purpose:
Single IP address associated with a network connection.
One or more IP addresses associated with a participant device at the time of the event (for example, if an EDR product knows all of the IP addresses associated with a device, it can encode all of these within IP fields).
Encoding: Valid IPv4 or IPv6 address (RFC 5942) encoded in ASCII.
Repeatability:
If an event is describing a specific network connection (for example, srcip:srcport > dstip:dstport), the vendor must provide only a single IP address.
If an event is describing general activity occurring on a participant device but not a specific network connection, the vendor might provide all of the associated IP addresses for the device at the time of the event.
Examples:
192.168.1.2
2001:db8:1:3::1
Noun.port
Purpose: Source or destination network port number when a specific network connection is described within an event.
Encoding: Valid TCP/IP port number from 1 through 65,535.
Examples:

80
443
Note: If a port number is specified, there must be one and only one IP address specified in the same Noun.
Noun.mac
Purpose: One or more MAC addresses associated with a device.
Encoding: Valid MAC address (EUI-48) in ASCII.
Repeatability: Vendor might provide all of the associated MAC addresses for the device at the time of the event.
Examples:
fedc:ba98:7654:3210:fedc:ba98:7654:3210
1080:0:0:0:8:800:200c:417a
00:a0:0:0:c9:14:c8:29
Noun.administrative_domain
Purpose: Domain which the device belongs to (for example, the Windows domain).
Encoding: Valid domain name string (128 characters maximum).
Example: corp.altostrat.com
Noun.registry
Purpose: Detailed registry metadata.
Type: Object
See Population of Registry metadata
Noun.url
Purpose: Standard URL
Encoding: URL (RFC 3986). Must have a valid protocol prefix (for example, https:// or ftp://). Must include the full domain and path. Might include the URL's parameters.
Example: https://foo.altostrat.com/bletch?a=b;c=d
Noun.user
Purpose: Detailed user metadata.
Type: Object
See Population of User metadata.`
      },
      {
        role: 'assistant',
        content: "Great! I'm ready to help you with your Google Chronicle Logstash parsing code. Please provide me with the raw log event and the log parser code. Once I have both inputs, I'll help you understand the expected transformation into a UDM definition in JSON format and offer suggestions or improvements if necessary.",
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  try {
    const response = await axios.post(apiURL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error making request:', (error as any).message);
    res.status(500).json({ message: 'Server error' });
  }
};

export default handler;
