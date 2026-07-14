import { Buffer } from "node:buffer";
import https from "node:https";

type IdssEndpoint = {
  name: string;
  description: string;
  path: string;
};

type EndpointResult = IdssEndpoint & {
  durationMs: number;
  ok: boolean;
  status?: number;
  statusText?: string;
  payload?: unknown;
  error?: string;
};

type IdssField = {
  field_identifier?: string;
  field_name?: string;
  value?: unknown;
};

type IdssListingPayload = {
  account_listing_id?: number;
  account_id?: number;
  parent_account_id?: number;
  account_name?: string;
  name?: string;
  description?: string;
  summary?: string;
  phone?: string;
  secondary_phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  twitter?: string;
  facebook?: string;
  you_tube?: string;
  linked_in?: string;
  instagram?: string;
  account_quality?: string;
  account_quality_name?: string;
  suite?: string;
  street?: string;
  address3?: string;
  address4?: string;
  city?: string;
  state?: string;
  county?: string;
  postal_code?: string;
  country?: string;
  google_map_query?: string;
  latitude?: number;
  longitude?: number;
  member_level_name?: string;
  is_primary?: boolean;
  external_reference?: string;
  web_cms_url?: string;
  geo_codes?: Record<string, unknown>[];
  account_types?: Record<string, unknown>[];
  categories?: Record<string, unknown>[];
  cuisines?: Record<string, unknown>[];
  images?: Record<string, unknown>[];
  files?: Record<string, unknown>[];
  listing_type?: string;
  fields?: IdssField[];
  amenities?: IdssField[];
};

type IdssAccountDetail = {
  detail_id?: number;
  account_id?: number;
  detail_type_id?: number;
  detail_type_name?: string;
  detail_name?: string;
  comments?: string;
  comments_html?: string;
  fields?: IdssField[];
};

type IdssSpace = {
  detail_space_id?: number;
  detail_id?: number;
  parent_detail_space_id?: number;
  detail_space_definition_id?: number;
  space_definition_name?: string;
  space_name?: string;
  space_description?: string;
  min_occupancy?: number;
  max_occupancy?: number;
  area?: number;
  height?: number;
  dimension?: string;
  measurement_units?: string;
  sort_order?: number;
  configs?: {
    detail_space_config_id?: number;
    detail_space_id?: number;
    detail_space_config_definition_id?: number;
    detail_space_config_definition_name?: string;
    description?: string;
    occupancy?: number;
    area?: number;
  }[];
  fields?: IdssField[];
};

type ContentfulFieldRow = {
  field: string;
  group: string;
  source: string;
  contentfulFieldId: string;
  contentfulType: string;
  sample?: string;
};

type ContentfulFieldInput = Omit<ContentfulFieldRow, "contentfulFieldId" | "contentfulType"> & {
  value?: unknown;
};

const IDSS_BASE_URL = "https://api-uat-ca.idss.com";
const LISTING_ENDPOINT_PATH = "/api/v2/listing/5";
const ACCOUNT_DETAIL_ENDPOINT_PATH = "/api/account/34804/detail";
const SPACE_ENDPOINT_PATH = "/api/space";

const endpoints: IdssEndpoint[] = [
  {
    name: "Listing 5",
    description: "Member listing content, images, main copy, and summary copy.",
    path: LISTING_ENDPOINT_PATH,
  },
  {
    name: "Account 34804 Details",
    description: "Amenities, green badges, certifications, and AccessNow fields.",
    path: ACCOUNT_DETAIL_ENDPOINT_PATH,
  },
  {
    name: "Meeting Spaces",
    description: "Room dimensions, layouts, capacities, and facilities.",
    path: SPACE_ENDPOINT_PATH,
  },
];

const oldListing = {
  _id: "68cb0862ee7b3ba687972299",
  social: [
    { fieldname: "URL", value: "Toronto Marriott City Centre Hotel", smfieldid: 7, smserviceid: 4 },
    { fieldname: "URL", value: "torontomarriottcc", smfieldid: 7, smserviceid: 13 },
    { fieldname: "URL", value: "torontomarriottcc", smfieldid: 7, smserviceid: 24 },
  ],
  taid: 155586,
  taoptin: false,
  zip: "M5V 1J1",
  contact_email: "erin.dumont@larcohotels.com",
  address1: "1 Blue Jays Way",
  media: [
    {
      mediaid: 17280,
      mediafile: "original_MH_YYZCC_Concierge_King_E40F06D8-5919-47D8-8F38F3AFE8255657.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Concierge_King_E40F06D8-5919-47D8-8F38F3AFE8255657_73ed5b10-2c9b-456e-9a41318505171d6d.jpg",
      sortorder: 1,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Concierge_King_E40F06D8-5919-47D8-8F38F3AFE8255657_73ed5b10-2c9b-456e-9a41318505171d6d.jpg",
      medianame: "Concierge King",
      mediatype: "Image",
    },
    {
      mediathumbfile: "thumb_Renaissance_Pool_09370.jpg",
      mediaid: 7890,
      mediafile: "original_Renaissance_Pool_09370.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/Renaissance_Pool_09370_5eeb7443-5056-a36f-23f393c57853c761.jpg",
      sortorder: 2,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/Renaissance_Pool_09370_5eeb7443-5056-a36f-23f393c57853c761.jpg",
      medianame: "Our Pool",
      mediatype: "Image",
    },
    {
      mediathumbfile: "thumb_renaissance_Gym_08710.jpg",
      mediaid: 7891,
      mediafile: "original_renaissance_Gym_08710.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/renaissance_Gym_08710_5eeb6bd5-5056-a36f-23d966a7f42e1ff4.jpg",
      sortorder: 3,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/renaissance_Gym_08710_5eeb6bd5-5056-a36f-23d966a7f42e1ff4.jpg",
      medianame: "Our Gym",
      mediatype: "Image",
    },
    {
      mediaid: 14513,
      mediafile: "original_MH_YYZCC_SPORTSNET_Bar_8DC764FB-A4AA-4754-BE8D37DF5EDE2FC5.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_SPORTSNET_Bar_8DC764FB-A4AA-4754-BE8D37DF5EDE2FC5_4d6910ae-9798-4fb1-8ed2300d598c374a.jpg",
      sortorder: 5,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_SPORTSNET_Bar_8DC764FB-A4AA-4754-BE8D37DF5EDE2FC5_4d6910ae-9798-4fb1-8ed2300d598c374a.jpg",
      medianame: "Sportsnet Grill",
      mediatype: "Image",
    },
    {
      mediaid: 17281,
      mediafile: "original_MH_YYZCC_Standard_Double_CityView_View_6BC841BC-9A84-4ABB-8E8262E86781B1D9.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Standard_Double_CityView_View_6BC841BC-9A84-4ABB-8E8262E86781B1D9_229c819e-b715-4250-9c91a574a52344e4.jpg",
      sortorder: 6,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Standard_Double_CityView_View_6BC841BC-9A84-4ABB-8E8262E86781B1D9_229c819e-b715-4250-9c91a574a52344e4.jpg",
      medianame: "Standard Double Cityview Room",
      mediatype: "Image",
    },
    {
      mediaid: 17282,
      mediafile: "original_008_Northem-Light-Ballroom-Theatre-Set-Up_6161_42DD2AAA-245E-427E-86D1543B78B41AF4.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/008_Northem-Light-Ballroom-Theatre-Set-Up_6161_42DD2AAA-245E-427E-86D1543B78B41AF4_a5ff22e9-8431-4064-bfd18949526045b5.jpg",
      sortorder: 7,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/008_Northem-Light-Ballroom-Theatre-Set-Up_6161_42DD2AAA-245E-427E-86D1543B78B41AF4_a5ff22e9-8431-4064-bfd18949526045b5.jpg",
      medianame: "Northern Lights Ballroom",
      mediatype: "Image",
    },
    {
      mediaid: 17283,
      mediafile: "original_010_Aurora-Room_6351_E97FD0B0-EBBA-44A8-B88A941E13E25B13.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/010_Aurora-Room_6351_E97FD0B0-EBBA-44A8-B88A941E13E25B13_52e91dd0-2479-44a8-becfc6b571e30b7d.jpg",
      sortorder: 8,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/010_Aurora-Room_6351_E97FD0B0-EBBA-44A8-B88A941E13E25B13_52e91dd0-2479-44a8-becfc6b571e30b7d.jpg",
      medianame: "Aurora Room",
      mediatype: "Image",
    },
    {
      mediaid: 18058,
      mediafile: "original_MH_YYZCC_Split_Level_1Queen_Fieldview_879A3FC3-A1BC-4941-AFE07569A7F7049B.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Split_Level_1Queen_Fieldview_879A3FC3-A1BC-4941-AFE07569A7F7049B_311e1ca3-4cce-4cc4-bbf741f7700a9968.jpg",
      sortorder: 10,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Split_Level_1Queen_Fieldview_879A3FC3-A1BC-4941-AFE07569A7F7049B_311e1ca3-4cce-4cc4-bbf741f7700a9968.jpg",
      medianame: "Fieldview Room",
      mediatype: "Image",
    },
    {
      mediaid: 18059,
      mediafile: "original_MH_YYZCC_Standard_King_Fieldview_89BF8F29-AE79-4DDF-B3D8E23861D45516.jpg",
      mediaurl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Standard_King_Fieldview_89BF8F29-AE79-4DDF-B3D8E23861D45516_e49a51f2-5b10-445d-a962780935e8d0d1.jpg",
      sortorder: 11,
      mediathumburl: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Standard_King_Fieldview_89BF8F29-AE79-4DDF-B3D8E23861D45516_e49a51f2-5b10-445d-a962780935e8d0d1.jpg",
      medianame: "Fieldview Standard",
      mediatype: "Image",
    },
  ],
  region: "City Center",
  fax: "416-341-5091",
  typeid: 16,
  company: "Toronto Marriott City Centre Hotel",
  listingudfs: [
    {
      name: "Shortlisting",
      value: "The world's first and only 348 guestroom hotel connected to a domed sports and entertainment facility with 70 rooms overlooking the stadium and field. Over 13,000 square feet of flexible meeting space is available along with four Skyboxes for ...",
      digits: 0,
      fieldid: 4007,
      typeid: 9,
      type: "Text Area",
      value_raw: "The world's first and only 348 guestroom hotel connected to a domed sports and entertainment facility with 70 rooms overlooking the stadium and field. Over 13,000 square feet of flexible meeting space is available along with four Skyboxes for ...",
      value_string: "The world's first and only 348 guestroom hotel connected to a domed sports and entertainment facility with 70 rooms overlooking the stadium and field. Over 13,000 square feet of flexible meeting space is available along with four Skyboxes for ...",
    },
    {
      name: "Randomized Listing Order",
      value: 1404,
      digits: 0,
      fieldid: 4816,
      typeid: 4,
      type: "Number",
      value_raw: 1404,
      value_string: "1404",
    },
  ],
  altphone: "1 800 237-1512",
  tacatid: 1,
  accountudfs: [
    { listid: 969, name: "RTO", value: "RTO - T", digits: 0, fieldid: 4029, typeid: 7, type: "Dropdown", value_raw: { listid: 969, value: "RTO - T" }, value_string: "RTO - T" },
    { listid: 2531, name: "Membership Type", value: "Business Membership", digits: 0, fieldid: 4801, typeid: 7, type: "Dropdown", value_raw: { listid: 2531, value: "Business Membership" }, value_string: "Business Membership" },
    { listid: 2108, name: "Membership Pipeline", value: "Renewed", digits: 0, fieldid: 4839, typeid: 7, type: "Dropdown", value_raw: { listid: 2108, value: "Renewed" }, value_string: "Renewed" },
    { listid: 2664, name: "Primary Business Type", value: "Accommodations", digits: 0, fieldid: 4977, typeid: 7, type: "Dropdown", value_raw: { listid: 2664, value: "Accommodations" }, value_string: "Accommodations" },
  ],
  description: "The world's first and only 4 diamond hotel connected to a domed sports and entertainment facility with 55 rooms overlooking the stadium and field. Over 13,000 square feet of flexible meeting space is available along with four Skyboxes for groups of up to 30. You will find this property next to the Metro Toronto Convention Centre, the CN Tower and Ripley's Aquarium. On the edge of Toronto's financial core and in the heart of the entertainment district. Where business and pleasure meet.",
  fullname: "Erin Dumont",
  city: "Toronto",
  acctid: 37,
  sortcompany: "toronto marriott city centre hotel",
  typename: "Content Hub Listing",
  rankorder: 1,
  state: "ON",
  fname: "Erin",
  recid: 29178,
  weburl: "https://www.marriott.com/hotels/travel/yyzcc-toronto-marriott-city-centre-hotel/",
  status: "Active",
  meetingfacility: {
    additional: [
      { tabshortname: "custommeetingfacilities", amenitytabid: 999, value: "4066", label: "Total Sq. Ft. Ballroom", shortname: "ballroomsize", amenitygroupid: 2, digits: 1, fieldid: 114, typeid: 4, type: "Number", value_raw: 4066, value_string: "4066.0" },
      { tabshortname: "custommeetingfacilities", amenitytabid: 999, value: "true", label: "Exhibit Space", shortname: "exhibitspace", amenitygroupid: 2, digits: 0, fieldid: 115, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes" },
      { tabshortname: "custommeetingfacilities", amenitytabid: 999, value: "https://www.marriott.com/en-us/hotels/yyzcc-toronto-marriott-city-centre-hotel/events/", label: "Floorplan (URL)", shortname: "floorplan", amenitygroupid: 2, digits: 0, fieldid: 56, typeid: 10, type: "URL", value_raw: "https://www.marriott.com/en-us/hotels/yyzcc-toronto-marriott-city-centre-hotel/events/", value_string: "https://www.marriott.com/en-us/hotels/yyzcc-toronto-marriott-city-centre-hotel/events/" },
      { tabshortname: "custommeetingfacilities", amenitytabid: 999, value: "4066", label: "Largest Room Sq. Ft.", shortname: "largestroomsize", amenitygroupid: 2, digits: 1, fieldid: 113, typeid: 4, type: "Number", value_raw: 4066, value_string: "4066.0" },
      { tabshortname: "custommeetingfacilities", amenitytabid: 999, value: "12224", label: "Total Meeting Space Sq. Ft.", shortname: "meetingspacesize", amenitygroupid: 2, digits: 1, fieldid: 112, typeid: 4, type: "Number", value_raw: 12224, value_string: "12224.0" },
      { tabshortname: "custommeetingfacilities", amenitytabid: 999, value: "10", label: "Number of Meeting Rooms", shortname: "totalmeetingrooms", amenitygroupid: 2, digits: 0, fieldid: 111, typeid: 4, type: "Number", value_raw: 10, value_string: "10" },
      { listid: 17, tabshortname: "custommeetingfacilities", amenitytabid: 999, value: "100-199", label: "Guest Capacity", shortname: "guestcapacity", amenitygroupid: 2, digits: 0, fieldid: 126, typeid: 7, type: "Dropdown", value_raw: { listid: 17, value: "100-199" }, value_string: "100-199" },
    ],
    exhibitspace: 1,
    numrooms: 10,
    largestroom: 4066,
    totalsqft: 12224,
    additional_object: {
      ballroomsize: { value: "4066", label: "Total Sq. Ft. Ballroom", shortname: "ballroomsize", fieldid: 114, typeid: 4, type: "Number", value_raw: 4066, value_string: "4066.0" },
      exhibitspace: { value: "true", label: "Exhibit Space", shortname: "exhibitspace", fieldid: 115, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes" },
      floorplan: { value: "https://www.marriott.com/en-us/hotels/yyzcc-toronto-marriott-city-centre-hotel/events/", label: "Floorplan (URL)", shortname: "floorplan", fieldid: 56, typeid: 10, type: "URL", value_raw: "https://www.marriott.com/en-us/hotels/yyzcc-toronto-marriott-city-centre-hotel/events/", value_string: "https://www.marriott.com/en-us/hotels/yyzcc-toronto-marriott-city-centre-hotel/events/" },
      largestroomsize: { value: "4066", label: "Largest Room Sq. Ft.", shortname: "largestroomsize", fieldid: 113, typeid: 4, type: "Number", value_raw: 4066, value_string: "4066.0" },
      meetingspacesize: { value: "12224", label: "Total Meeting Space Sq. Ft.", shortname: "meetingspacesize", fieldid: 112, typeid: 4, type: "Number", value_raw: 12224, value_string: "12224.0" },
      totalmeetingrooms: { value: "10", label: "Number of Meeting Rooms", shortname: "totalmeetingrooms", fieldid: 111, typeid: 4, type: "Number", value_raw: 10, value_string: "10" },
      guestcapacity: { listid: 17, value: "100-199", label: "Guest Capacity", shortname: "guestcapacity", fieldid: 126, typeid: 7, type: "Dropdown", value_raw: { listid: 17, value: "100-199" }, value_string: "100-199" },
    },
  },
  phone: "416 341-7100",
  addressid: 17,
  amenities_array: [
    { tabshortname: "general", amenitytabid: 1, value: "true", label: "Delivery Available", shortname: "deliveryavailable", amenitygroupid: 33, digits: 0, fieldid: 286, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_deliveryavailable" },
    { tabshortname: "general", amenitytabid: 1, value: "true", label: "Full Buyouts", shortname: "fullbuyouts", amenitygroupid: 33, digits: 0, fieldid: 308, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_fullbuyouts" },
    { tabshortname: "general", amenitytabid: 1, value: "true", label: "Patio Dining", shortname: "patiodining", amenitygroupid: 33, digits: 0, fieldid: 277, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_patiodining" },
    { tabshortname: "general", amenitytabid: 1, value: "true", label: "Private Dining Space", shortname: "privatediningspace", amenitygroupid: 33, digits: 0, fieldid: 306, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_privatediningspace" },
    { tabshortname: "general", amenitytabid: 1, value: "150", label: "Capacity of Private Dining Space", shortname: "privatediningspacecapacity", amenitygroupid: 33, digits: 0, fieldid: 307, typeid: 8, type: "Text", value_raw: "150", value_string: "150", uniquename: "general_privatediningspacecapacity" },
    { tabshortname: "accommodations", amenitytabid: 1009, value: "true", label: "Does your property have a fitness centre?", shortname: "fitnesscentre", amenitygroupid: 18, digits: 0, fieldid: 110, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "accommodations_fitnesscentre" },
    { tabshortname: "accommodations", amenitytabid: 1009, value: "true", label: "Does your property have a pool?", shortname: "pool", amenitygroupid: 18, digits: 0, fieldid: 107, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "accommodations_pool" },
    { listid: 14, tabshortname: "accommodations", amenitytabid: 1009, value: "Indoor", label: "Pool location", shortname: "location", amenitygroupid: 18, digits: 0, fieldid: 109, typeid: 7, type: "Dropdown", value_raw: { listid: 14, value: "Indoor" }, value_string: "Indoor", uniquename: "accommodations_location" },
  ],
  rankname: "Member",
  crmtracking: {
    core_itinerary: "58_29178",
    core_booking_click: "7_29178",
    custom_referrals_bookdirect_lodging: "112_29178",
    core_map_view: "59_29178",
    core_listing_view: "1_29178",
    core_mobile_view: "17_29178",
    custom_threshold_360_views: "120_29178",
    custom_instagram_views: "114_29178",
    custom_visitapps_listing_view: "111_29178",
    custom_referrals_bandwango: "124_29178",
    custom_referrals_bookdirect_activities: "113_29178",
    core_twitter_view: "12_29178",
    core_mobile_click: "16_29178",
    custom_referrals_ticketmaster: "123_29178",
    custom_core_placeholder: "125_29178",
    core_listing_click: "4_29178",
    custom_visitapps_passport_check_in: "110_29178",
    custom_ticketed_event_referrals: "122_29178",
    custom_instagram_click_thrus: "115_29178",
    core_facebook_view: "14_29178",
    custom_youtube_click_thrus: "117_29178",
    core_mobile_call: "18_29178",
    core_facebook_click: "15_29178",
    custom_youtube_views: "116_29178",
    custom_referrals_viator: "121_29178",
    custom_pinterest_views: "118_29178",
    custom_pinterest_click_thrus: "119_29178",
    core_twitter_click: "13_29178",
  },
  country: "CANADA",
  tollfree: "1-800-237-1512",
  lname: "Dumont",
  rankid: 6,
  meetingrooms: [
    { roomname: "Northern Lights Ballroom", roomid: "1596", banquet: "250", height: "14", udfs: [{ name: "U-Shape Capacity", value: 45, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 45, value_string: "45" }], classroom: "150", reception: "300", theater: "320", sqft: "4066", udfs_object: { 4538: { name: "U-Shape Capacity", value: 45, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 45, value_string: "45" } } },
    { roomname: "Aurora Room", roomid: "1597", banquet: "120", height: "14", udfs: [{ name: "U-Shape Capacity", value: 36, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 36, value_string: "36" }, { name: "Boardroom capacity", value: 28, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 28, value_string: "28" }], classroom: "48", reception: "150", theater: "80", sqft: "2110", udfs_object: { 4538: { name: "U-Shape Capacity", value: 36, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 36, value_string: "36" }, 4539: { name: "Boardroom capacity", value: 28, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 28, value_string: "28" } } },
    { roomname: "Blue Jays Room", roomid: "1599", banquet: "56", height: "10", udfs: [{ name: "U-Shape Capacity", value: 24, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 24, value_string: "24" }, { name: "Boardroom capacity", value: 20, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 20, value_string: "20" }], classroom: "42", reception: "80", theater: "70", sqft: "1308" },
    { roomname: "Raptor Room", roomid: "1600", banquet: "64", height: "10", udfs: [{ name: "U-Shape Capacity", value: 36, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 36, value_string: "36" }, { name: "Boardroom capacity", value: 40, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 40, value_string: "40" }], classroom: "60", reception: "80", theater: "100", sqft: "1185" },
    { roomname: "Maple Leaf Room", roomid: "1601", banquet: "32", height: "10", udfs: [{ name: "U-Shape Capacity", value: 18, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 18, value_string: "18" }, { name: "Boardroom capacity", value: 24, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 24, value_string: "24" }], classroom: "24", reception: "40", theater: "40", sqft: "640" },
    { roomname: "SkyBox 1", roomid: "1602", banquet: "32", height: "8", udfs: [{ name: "U-Shape Capacity", value: 18, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 18, value_string: "18" }, { name: "Boardroom capacity", value: 10, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 10, value_string: "10" }], classroom: "24", reception: "25", theater: "10", sqft: "469" },
    { roomname: "SkyBox 2", roomid: "1603", banquet: "32", height: "7", udfs: [{ name: "U-Shape Capacity", value: 18, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 18, value_string: "18" }, { name: "Boardroom capacity", value: 10, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 10, value_string: "10" }], classroom: "24", reception: "25", theater: "10", sqft: "450" },
    { roomname: "SkyBox 3", roomid: "1604", banquet: "32", height: "7", udfs: [{ name: "U-Shape Capacity", value: 18, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 18, value_string: "18" }, { name: "Boardroom capacity", value: 12, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 12, value_string: "12" }], classroom: "24", reception: "25", theater: "12", sqft: "444" },
    { roomname: "SkyBox 4", roomid: "1605", banquet: "32", height: "8", udfs: [{ name: "U-Shape Capacity", value: 18, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 18, value_string: "18" }, { name: "Boardroom capacity", value: 16, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 16, value_string: "16" }], classroom: "24", reception: "30", theater: "16", sqft: "572" },
    { roomname: "Legends Lounge", roomid: "1606", banquet: "50", height: "8", udfs: [{ name: "U-Shape Capacity", value: 18, digits: 0, fieldid: 4538, typeid: 4, type: "Number", value_raw: 18, value_string: "18" }, { name: "Boardroom capacity", value: 16, digits: 0, fieldid: 4539, typeid: 4, type: "Number", value_raw: 16, value_string: "16" }], classroom: "24", reception: "60", theater: "16", sqft: "980" },
  ],
  contactid: 5913,
  addresstype: "Physical",
  statusid: 1639,
  categories: [
    { primary: true, subcatid: 2670, subcatname: "Hotels", catname: "Accommodations", catid: 226, threshold360id: "8453331", parentid: 14565, title: "Toronto Marriott City Centre Hotel", regionid: 100 },
  ],
  social_object: {
    Facebook: [{ fieldname: "URL", value: "Toronto Marriott City Centre Hotel", smfieldid: 7, smserviceid: 4 }],
    Instagram: [{ fieldname: "URL", value: "torontomarriottcc", smfieldid: 7, smserviceid: 13 }],
    TikTok: [{ fieldname: "URL", value: "torontomarriottcc", smfieldid: 7, smserviceid: 24 }],
  },
  listingudfs_object: {
    4007: { name: "Shortlisting", value: "The world's first and only 348 guestroom hotel connected to a domed sports and entertainment facility with 70 rooms overlooking the stadium and field. Over 13,000 square feet of flexible meeting space is available along with four Skyboxes for ...", digits: 0, fieldid: 4007, typeid: 9, type: "Text Area", value_raw: "The world's first and only 348 guestroom hotel connected to a domed sports and entertainment facility with 70 rooms overlooking the stadium and field. Over 13,000 square feet of flexible meeting space is available along with four Skyboxes for ...", value_string: "The world's first and only 348 guestroom hotel connected to a domed sports and entertainment facility with 70 rooms overlooking the stadium and field. Over 13,000 square feet of flexible meeting space is available along with four Skyboxes for ..." },
    4816: { name: "Randomized Listing Order", value: 1404, digits: 0, fieldid: 4816, typeid: 4, type: "Number", value_raw: 1404, value_string: "1404" },
  },
  accountudfs_object: {
    4029: { listid: 969, name: "RTO", value: "RTO - T", digits: 0, fieldid: 4029, typeid: 7, type: "Dropdown", value_raw: { listid: 969, value: "RTO - T" }, value_string: "RTO - T" },
    4801: { listid: 2531, name: "Membership Type", value: "Business Membership", digits: 0, fieldid: 4801, typeid: 7, type: "Dropdown", value_raw: { listid: 2531, value: "Business Membership" }, value_string: "Business Membership" },
    4839: { listid: 2108, name: "Membership Pipeline", value: "Renewed", digits: 0, fieldid: 4839, typeid: 7, type: "Dropdown", value_raw: { listid: 2108, value: "Renewed" }, value_string: "Renewed" },
    4977: { listid: 2664, name: "Primary Business Type", value: "Accommodations", digits: 0, fieldid: 4977, typeid: 7, type: "Dropdown", value_raw: { listid: 2664, value: "Accommodations" }, value_string: "Accommodations" },
  },
  amenities: {
    general_deliveryavailable: { value: "true", label: "Delivery Available", shortname: "deliveryavailable", fieldid: 286, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_deliveryavailable" },
    general_fullbuyouts: { value: "true", label: "Full Buyouts", shortname: "fullbuyouts", fieldid: 308, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_fullbuyouts" },
    general_patiodining: { value: "true", label: "Patio Dining", shortname: "patiodining", fieldid: 277, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_patiodining" },
    general_privatediningspace: { value: "true", label: "Private Dining Space", shortname: "privatediningspace", fieldid: 306, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "general_privatediningspace" },
    general_privatediningspacecapacity: { value: "150", label: "Capacity of Private Dining Space", shortname: "privatediningspacecapacity", fieldid: 307, typeid: 8, type: "Text", value_raw: "150", value_string: "150", uniquename: "general_privatediningspacecapacity" },
    accommodations_fitnesscentre: { value: "true", label: "Does your property have a fitness centre?", shortname: "fitnesscentre", fieldid: 110, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "accommodations_fitnesscentre" },
    accommodations_pool: { value: "true", label: "Does your property have a pool?", shortname: "pool", fieldid: 107, typeid: 11, type: "Yes/No", value_raw: true, value_string: "Yes", uniquename: "accommodations_pool" },
    accommodations_location: { listid: 14, value: "Indoor", label: "Pool location", shortname: "location", fieldid: 109, typeid: 7, type: "Dropdown", value_raw: { listid: 14, value: "Indoor" }, value_string: "Indoor", uniquename: "accommodations_location" },
  },
  updated: "2026-06-17T08:17:59.845Z",
  contacttitle: "Lead Catcher/Sales Coordinator",
  alpha: "t",
  loc: { type: "Point", coordinates: [-79.3891419, 43.641804] },
  sites: ["primary", "maps", "splash", "meetings", "rto5", "inc"],
  primary_site: "primary",
  primary_category: { primary: true, subcatid: 2670, subcatname: "Hotels", catname: "Accommodations", catid: 226 },
  primarycatid: 226,
  primarysubcatid: 2670,
  cms_title: "Toronto Marriott City Centre Hotel - Accommodations - Hotels (29178)",
  cms_title_sort: "toronto marriott city centre hotel - accommodations - hotels (29178)",
  primary_image_url: "https://assets.simpleviewinc.com/simpleview/image/upload/crm/toronto/MH_YYZCC_Concierge_King_E40F06D8-5919-47D8-8F38F3AFE8255657_73ed5b10-2c9b-456e-9a41318505171d6d.jpg",
  primary_image_is_default: false,
  filter_tags: [
    "site_primary",
    "catid_226",
    "subcatid_2670",
    "site_primary_catid_226",
    "site_primary_subcatid_2670",
    "site_primary_catid_226_subcatid_2670",
    "site_maps",
    "site_maps_catid_226",
    "site_maps_subcatid_2670",
    "site_maps_catid_226_subcatid_2670",
    "site_splash",
    "site_splash_catid_226",
    "site_splash_subcatid_2670",
    "site_splash_catid_226_subcatid_2670",
    "site_meetings",
    "site_meetings_catid_226",
    "site_meetings_subcatid_2670",
    "site_meetings_catid_226_subcatid_2670",
    "site_rto5",
    "site_rto5_catid_226",
    "site_rto5_subcatid_2670",
    "site_rto5_catid_226_subcatid_2670",
    "site_inc",
    "site_inc_catid_226",
    "site_inc_subcatid_2670",
    "site_inc_subcatid_2670",
    "site_inc_catid_226_subcatid_2670",
  ],
  qualityScore: -1,
};

const mappingRows = [
  {
    oldField: "company",
    source: "Listing endpoint",
    sourcePath: "account_name",
    transform: "Rename account_name to company.",
  },
  {
    oldField: "acctid",
    source: "Listing endpoint",
    sourcePath: "account_id",
    transform: "Rename account_id to acctid.",
  },
  {
    oldField: "recid",
    source: "Listing endpoint",
    sourcePath: "account_listing_id",
    transform: "Closest available listing id. Old recid is not the same identifier family.",
  },
  {
    oldField: "phone / altphone / tollfree / fax",
    source: "Listing endpoint",
    sourcePath: "phone, secondary_phone, fax",
    transform: "Rename and normalize phone formatting.",
  },
  {
    oldField: "weburl",
    source: "Listing endpoint",
    sourcePath: "website",
    transform: "Rename website to weburl.",
  },
  {
    oldField: "social / social_object",
    source: "Listing endpoint",
    sourcePath: "facebook, instagram",
    transform: "Build social array/object and assign service ids separately if needed.",
  },
  {
    oldField: "address1 / city / state / zip / country",
    source: "Listing endpoint",
    sourcePath: "street, city, state, postal_code, country",
    transform: "Rename fields; trim trailing punctuation; convert province/country labels if needed.",
  },
  {
    oldField: "region",
    source: "Listing endpoint",
    sourcePath: "geo_codes[0].geo_code_name",
    transform: "Use first matching geo code, e.g. City Center.",
  },
  {
    oldField: "categories / primary_category / filter_tags",
    source: "Listing endpoint",
    sourcePath: "categories[]",
    transform: "Does not line up 1:1. New API has flat category_id/category_name. Old shape needs catid/subcatid/parent category logic from legacy taxonomy.",
  },
  {
    oldField: "media",
    source: "Listing endpoint + account detail",
    sourcePath: "images[] and detail_type_name=General fields with Image_* identifiers",
    transform: "Map images to mediaid/mediaurl/medianame/sortorder. Old media ids are legacy ids and may not exist in new API.",
  },
  {
    oldField: "listingudfs / listingudfs_object",
    source: "Account detail endpoint",
    sourcePath: "detail_type_name=General fields: Shortlisting, Randomized Listing Order",
    transform: "Convert fields array into array plus object keyed by legacy field id or identifier.",
  },
  {
    oldField: "accountudfs / accountudfs_object",
    source: "Listing endpoint + account detail endpoint",
    sourcePath: "fields[] and detail_type_name=Account Layout fields",
    transform: "Filter account-level fields like RTO, Membership Type, Membership Pipeline, Primary Business Type.",
  },
  {
    oldField: "amenities_array / amenities",
    source: "Listing endpoint + account detail endpoint",
    sourcePath: "amenities[] and detail types General/ConsumerAccommodations/GuestServices/Certifications",
    transform: "Group checkbox/list fields into legacy amenity objects keyed by tab/shortname.",
  },
  {
    oldField: "meetingfacility",
    source: "Account detail endpoint",
    sourcePath: "detail_type_name=Meeting Spaces fields",
    transform: "Map TotalSqFt, LargestRoom, NumRooms, ExhibitSpace into totalsqft, largestroom, numrooms, exhibitspace.",
  },
  {
    oldField: "meetingrooms",
    source: "Space endpoint",
    sourcePath: "spaces filtered to the account/detail meeting space record",
    transform: "Map space_name, area, height, configs Theater/Classroom/Banquet/Reception into roomname, sqft, height, theater, classroom, banquet, reception.",
  },
  {
    oldField: "certifications / green badges / AccessNow fields",
    source: "Account detail endpoint",
    sourcePath: "detail_type_name=Certifications and CertificationSubmissions fields",
    transform: "These are account-level fields; they do not belong to the listing endpoint payload.",
  },
];

function getContentfulFieldType(field: string, value?: unknown) {
  const normalizedField = field.toLowerCase();

  if (typeof value === "boolean") {
    return "Boolean";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? "Integer" : "Number";
  }

  if (Array.isArray(value)) {
    return field === "images[]" || field === "files[]" ? "Media, many files" : "JSON object";
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "false", "yes", "no"].includes(normalizedValue)) {
      return "Boolean";
    }
  }

  if (normalizedField.includes("date") || normalizedField.includes("dov")) {
    return "Date";
  }

  if (normalizedField.includes("url") || normalizedField.includes("website")) {
    return "Short text, URL";
  }

  if (field === "latitude" || field === "longitude") {
    return "Number";
  }

  if (field === "is_primary" || field.endsWith(".is_primary_category")) {
    return "Boolean";
  }

  if (
    field === "description" ||
    field === "summary" ||
    normalizedField.includes("description") ||
    normalizedField.includes("review") ||
    field.endsWith(".comments") ||
    field.endsWith(".comments_html")
  ) {
    return "Long text";
  }

  if (field === "images[]") {
    return "Media, many files";
  }

  if (field === "files[]") {
    return "Media, many files";
  }

  if (field.endsWith("[]")) {
    return "JSON object";
  }

  if (field.includes("_id") || field.endsWith(".detail_id") || field.endsWith(".parent_id")) {
    return "Integer";
  }

  if (
    field.includes("sort_order") ||
    field.includes("occupancy") ||
    field.endsWith(".area") ||
    field.endsWith(".height") ||
    field.includes("SqFt")
  ) {
    return "Number";
  }

  return "Short text";
}

function toContentfulFieldId(field: string) {
  const sourceIdentifier = field.match(/field_identifier="([^"]+)"/)?.[1] ?? field;
  const words = sourceIdentifier
    .replace(/\[.*?\]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/);
  const fieldId = words
    .map((word, index) => {
      const normalized = word.replace(/^[0-9]+/, "");

      if (!normalized) {
        return "";
      }

      return index === 0
        ? normalized.charAt(0).toLowerCase() + normalized.slice(1)
        : normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join("")
    .slice(0, 64);

  return /^[a-zA-Z]/.test(fieldId) ? fieldId : `field${fieldId.charAt(0).toUpperCase()}${fieldId.slice(1)}`;
}

function getSampleValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const sample = typeof value === "object" ? JSON.stringify(value) : String(value);

  return sample.length > 120 ? `${sample.slice(0, 117)}...` : sample;
}

function addContentfulFieldRow(rows: Map<string, ContentfulFieldRow>, row: ContentfulFieldInput) {
  if (rows.has(row.field)) {
    return;
  }

  rows.set(row.field, {
    field: row.field,
    group: row.group,
    source: row.source,
    sample: row.sample,
    contentfulFieldId: toContentfulFieldId(row.field),
    contentfulType: getContentfulFieldType(row.field, row.value),
  });
}

function addObjectFieldRows(rows: Map<string, ContentfulFieldRow>, record: Record<string, unknown>, group: string, source: string, prefix = "") {
  for (const [key, value] of Object.entries(record)) {
    const field = prefix ? `${prefix}.${key}` : key;

    addContentfulFieldRow(rows, {
      field,
      group,
      source,
      value,
      sample: getSampleValue(value),
    });

    if (Array.isArray(value)) {
      addContentfulFieldRow(rows, {
        field: `${field}[]`,
        group,
        source,
        value,
        sample: getSampleValue(value),
      });

      for (const item of value) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          addObjectFieldRows(rows, item as Record<string, unknown>, group, source, `${field}[]`);
        }
      }
    }
  }
}

function getIdssFieldKey(field: IdssField, index: number) {
  return field.field_identifier || field.field_name || `field_${index + 1}`;
}

function buildContentfulFieldRows(consolidatedFeed: NonNullable<ReturnType<typeof buildConsolidatedFeed>>) {
  const rows = new Map<string, ContentfulFieldRow>();

  addObjectFieldRows(rows, consolidatedFeed.sourceData.listing as Record<string, unknown>, "listing", LISTING_ENDPOINT_PATH);

  for (const detail of consolidatedFeed.accountDetails) {
    addObjectFieldRows(rows, detail as Record<string, unknown>, `account detail: ${detail.detail_type_name ?? "unknown"}`, ACCOUNT_DETAIL_ENDPOINT_PATH, "accountDetails[]");

    detail.fields.forEach((field, index) => {
      const fieldKey = getIdssFieldKey(field, index);

      addContentfulFieldRow(rows, {
        field: `accountDetails[detail_type_name="${detail.detail_type_name}"].fields[field_identifier="${fieldKey}"].value`,
        group: `account detail: ${detail.detail_type_name ?? "unknown"}`,
        source: ACCOUNT_DETAIL_ENDPOINT_PATH,
        value: field.value,
        sample: getSampleValue(field.value),
      });
    });
  }

  consolidatedFeed.meetingRooms.forEach((room) => {
    addObjectFieldRows(rows, room as Record<string, unknown>, "meeting space", SPACE_ENDPOINT_PATH, "meetingRooms[]");
  });

  return [...rows.values()].sort((first, second) =>
    first.group.localeCompare(second.group) || first.field.localeCompare(second.field),
  );
}

function getAuthHeader() {
  const username = process.env.IDSS_API_USERNAME;
  const password = process.env.IDSS_API_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function fetchEndpoint(endpoint: IdssEndpoint): Promise<EndpointResult> {
  const authHeader = getAuthHeader();
  const startedAt = Date.now();

  if (!authHeader) {
    return {
      ...endpoint,
      durationMs: 0,
      ok: false,
      error: "Missing IDSS_API_USERNAME or IDSS_API_PASSWORD in .env.",
    };
  }

  try {
    const response = await requestIdssEndpoint(endpoint.path, authHeader);
    const payload = response.contentType.includes("application/json")
      ? JSON.parse(response.body)
      : response.body;

    return {
      ...endpoint,
      durationMs: Date.now() - startedAt,
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      payload,
    };
  } catch (error) {
    return {
      ...endpoint,
      durationMs: Date.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown request error.",
    };
  }
}

function requestIdssEndpoint(path: string, authHeader: string) {
  const url = new URL(path, IDSS_BASE_URL);

  return new Promise<{
    body: string;
    contentType: string;
    status: number;
    statusText: string;
  }>((resolve, reject) => {
    const request = https.request(
      url,
      {
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: response.headers["content-type"] ?? "",
            status: response.statusCode ?? 0,
            statusText: response.statusMessage ?? "",
          });
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

function formatPayload(payload: unknown) {
  if (payload === undefined) {
    return "No response payload.";
  }

  if (typeof payload === "string") {
    return payload || "Empty response body.";
  }

  return JSON.stringify(payload, null, 2);
}

function asArray<T>(payload: unknown): T[] {
  return Array.isArray(payload) ? payload : [];
}

function getResultPayload<T>(results: EndpointResult[], path: string) {
  return results.find((result) => result.path === path && result.ok)?.payload as T | undefined;
}

function getFieldValue(fields: IdssField[] | undefined, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const field = fields?.find((item) => {
    const identifier = item.field_identifier?.toLowerCase();
    const fieldName = item.field_name?.toLowerCase();

    return normalizedNames.includes(identifier ?? "") || normalizedNames.includes(fieldName ?? "");
  });

  return field?.value;
}

function buildCapacityMap(space: IdssSpace) {
  return Object.fromEntries(
    (space.configs ?? []).map((config) => [
      config.detail_space_config_definition_name?.toLowerCase() ?? "",
      config.occupancy,
    ]),
  );
}

function getRecordText(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];

  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function getSortedCategories(categories: Record<string, unknown>[] | undefined) {
  return [...(categories ?? [])].sort(
    (first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0),
  );
}

function getSortedGeoCodes(geoCodes: Record<string, unknown>[] | undefined) {
  return [...(geoCodes ?? [])].sort(
    (first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0),
  );
}

function buildConsolidatedFeed(results: EndpointResult[]) {
  const listing = getResultPayload<IdssListingPayload>(results, LISTING_ENDPOINT_PATH);
  const accountDetails = asArray<IdssAccountDetail>(
    getResultPayload<IdssAccountDetail[]>(results, ACCOUNT_DETAIL_ENDPOINT_PATH),
  );
  const spaces = asArray<IdssSpace>(getResultPayload<IdssSpace[]>(results, SPACE_ENDPOINT_PATH));
  const meetingDetail = accountDetails.find((detail) => detail.detail_type_name === "Meeting Spaces");
  const meetingSpaces = spaces
    .filter((space) => space.detail_id === meetingDetail?.detail_id)
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0));

  if (!listing) {
    return null;
  }

  const categories = getSortedCategories(listing.categories);
  const category = categories[0];
  const subcategory = categories[1];
  const geoCodes = getSortedGeoCodes(listing.geo_codes);
  const region = geoCodes[0];

  return {
    sourceEndpoints: [LISTING_ENDPOINT_PATH, ACCOUNT_DETAIL_ENDPOINT_PATH, SPACE_ENDPOINT_PATH],
    sourceData: {
      listing,
      accountDetails,
      spaces,
      joinedMeetingSpaces: meetingSpaces,
    },
    account: {
      account_listing_id: listing.account_listing_id,
      account_id: listing.account_id,
      parent_account_id: listing.parent_account_id,
      account_name: listing.account_name,
      name: listing.name,
      description: listing.description,
      summary: listing.summary,
      account_quality: listing.account_quality,
      account_quality_name: listing.account_quality_name,
      member_level_name: listing.member_level_name,
      is_primary: listing.is_primary,
      external_reference: listing.external_reference,
      web_cms_url: listing.web_cms_url,
      listing_type: listing.listing_type,
      phone: listing.phone,
      secondary_phone: listing.secondary_phone,
      fax: listing.fax,
      email: listing.email,
      website: listing.website,
      social: {
        twitter: listing.twitter,
        facebook: listing.facebook,
        you_tube: listing.you_tube,
        linked_in: listing.linked_in,
        instagram: listing.instagram,
      },
      address: {
        suite: listing.suite,
        street: listing.street,
        address3: listing.address3,
        address4: listing.address4,
        city: listing.city,
        state: listing.state,
        county: listing.county,
        postal_code: listing.postal_code,
        country: listing.country,
        google_map_query: listing.google_map_query,
        latitude: listing.latitude,
        longitude: listing.longitude,
      },
      geo_code: {
        geo_code_id: getRecordText(region, "geo_code_id"),
        geo_code_name: getRecordText(region, "geo_code_name"),
        parent_id: getRecordText(region, "parent_id"),
        raw: region ?? null,
      },
      geo_codes: geoCodes,
      account_types: listing.account_types ?? [],
      category: {
        category_id: getRecordText(category, "category_id"),
        category_name: getRecordText(category, "category_name"),
        raw: category ?? null,
      },
      subcategory: {
        category_id: getRecordText(subcategory, "category_id"),
        category_name: getRecordText(subcategory, "category_name"),
        raw: subcategory ?? null,
      },
      categories,
      cuisines: listing.cuisines ?? [],
      images: listing.images ?? [],
      files: listing.files ?? [],
      fields: listing.fields ?? [],
      amenities: listing.amenities ?? [],
    },
    accountDetails: accountDetails.map((detail) => ({
      detail_id: detail.detail_id,
      account_id: detail.account_id,
      detail_type_id: detail.detail_type_id,
      detail_type_name: detail.detail_type_name,
      detail_name: detail.detail_name,
      comments: detail.comments,
      comments_html: detail.comments_html,
      fields: detail.fields ?? [],
    })),
    meetingFacility: meetingDetail
      ? {
          detail_id: meetingDetail.detail_id,
          detail_type_name: meetingDetail.detail_type_name,
          totalSqFt: getFieldValue(meetingDetail.fields, ["TotalSqFt", "Total Sq. Ft."]),
          largestRoom: getFieldValue(meetingDetail.fields, ["LargestRoom", "Largest Room"]),
          numberOfRooms: getFieldValue(meetingDetail.fields, ["NumRooms", "Number of Meeting Rooms"]),
          exhibitSpace: getFieldValue(meetingDetail.fields, ["ExhibitSpace", "Exhibit Space"]),
        }
      : null,
    meetingRooms: meetingSpaces.map((space) => {
      const capacities = buildCapacityMap(space);

      return {
        detail_space_id: space.detail_space_id,
        detail_id: space.detail_id,
        parent_detail_space_id: space.parent_detail_space_id,
        detail_space_definition_id: space.detail_space_definition_id,
        space_definition_name: space.space_definition_name,
        roomname: space.space_name,
        description: space.space_description,
        min_occupancy: space.min_occupancy,
        max_occupancy: space.max_occupancy,
        sqft: space.area,
        height: space.height,
        dimension: space.dimension,
        measurement_units: space.measurement_units,
        sort_order: space.sort_order,
        theater: capacities.theater,
        classroom: capacities.classroom,
        banquet: capacities.banquet,
        reception: capacities.reception,
        configs: space.configs ?? [],
        fields: space.fields ?? [],
      };
    }),
  };
}

export default async function Home() {
  const results = await Promise.all(endpoints.map(fetchEndpoint));
  const successfulRequests = results.filter((result) => result.ok).length;
  const consolidatedFeed = buildConsolidatedFeed(results);
  const contentfulRows = consolidatedFeed ? buildContentfulFieldRows(consolidatedFeed) : [];

  return (
    <main className="min-h-screen bg-[#f5f1e8] px-5 py-8 text-[#20201d] sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-5 border-b border-[#cfc6b4] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
              iDSS UAT API
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#151512] sm:text-5xl">
              Endpoint Connection Check
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5d584f]">
              Live listing, account detail, and meeting space records joined into
              one feed. The old listing below remains a separate reference only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
            <div className="border border-[#cfc6b4] bg-white/65 p-4">
              <p className="text-[#6f675a]">Connected</p>
              <p className="mt-2 text-3xl font-semibold">{successfulRequests}</p>
            </div>
            <div className="border border-[#cfc6b4] bg-white/65 p-4">
              <p className="text-[#6f675a]">Total</p>
              <p className="mt-2 text-3xl font-semibold">{results.length}</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 border-b border-[#cfc6b4] pb-4 text-sm">
          {[
            ["#consolidated-feed", "Consolidated Feed"],
            ["#contentful-field-list", "Contentful Field List"],
            ["#raw-endpoints", "Raw Endpoints"],
            ["#merge-map", "Merge Map"],
            ["#old-listing", "Old Listing"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="border border-[#cfc6b4] bg-white/70 px-3 py-2 font-medium text-[#20201d] hover:bg-[#fffaf0]"
            >
              {label}
            </a>
          ))}
        </nav>

        <article id="consolidated-feed" className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
                Consolidated Feed
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {consolidatedFeed?.account.account_name ?? "No listing payload"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#625c52]">
                {consolidatedFeed?.account.description ??
                  "The feed can be built after the listing endpoint returns successfully."}
              </p>
            </div>

            <dl className="grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2 lg:min-w-[480px]">
              <div>
                <dt className="font-semibold text-[#20201d]">Account</dt>
                <dd>{consolidatedFeed?.account.account_id ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">categories[0].category_name</dt>
                <dd>{consolidatedFeed?.account.category.category_name ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">categories[1].category_name</dt>
                <dd>{consolidatedFeed?.account.subcategory.category_name ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">geo_codes[0].geo_code_name</dt>
                <dd>{consolidatedFeed?.account.geo_code.geo_code_name ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">Joined rooms</dt>
                <dd>{consolidatedFeed?.meetingRooms.length ?? 0}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">Live Summary</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">Listing</dt>
                  <dd>{consolidatedFeed?.account.account_listing_id ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Website</dt>
                  <dd className="break-all">{consolidatedFeed?.account.website ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Phone</dt>
                  <dd>{consolidatedFeed?.account.phone ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Email</dt>
                  <dd className="break-all">{consolidatedFeed?.account.email ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">categories[0].category_id</dt>
                  <dd>{consolidatedFeed?.account.category.category_id ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">categories[1].category_id</dt>
                  <dd>{consolidatedFeed?.account.subcategory.category_id ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">geo_codes[0].geo_code_id</dt>
                  <dd>{consolidatedFeed?.account.geo_code.geo_code_id ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">geo_codes[0].parent_id</dt>
                  <dd>{consolidatedFeed?.account.geo_code.parent_id ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">geo_codes.length</dt>
                  <dd>{consolidatedFeed?.account.geo_codes.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">account_types.length</dt>
                  <dd>{consolidatedFeed?.account.account_types.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Detail Rows</dt>
                  <dd>{consolidatedFeed?.sourceData.accountDetails.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Space Rows</dt>
                  <dd>{consolidatedFeed?.sourceData.spaces.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Latitude</dt>
                  <dd>{consolidatedFeed?.account.address.latitude ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Longitude</dt>
                  <dd>{consolidatedFeed?.account.address.longitude ?? "Missing"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-[#20201d]">Address</dt>
                  <dd>
                    {[
                      consolidatedFeed?.account.address.street,
                      consolidatedFeed?.account.address.city,
                      consolidatedFeed?.account.address.state,
                      consolidatedFeed?.account.address.postal_code,
                      consolidatedFeed?.account.address.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Missing"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">Meeting Facility</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">Total Sq. Ft.</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.totalSqFt ?? "Missing")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Largest Room</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.largestRoom ?? "Missing")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Meeting Rooms</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.numberOfRooms ?? "Missing")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Exhibit Space</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.exhibitSpace ?? "Missing")}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">Categories</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Level</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">ID</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Name</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Primary</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Sort</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedFeed?.account.categories.map((categoryRow, index) => (
                    <tr key={`${getRecordText(categoryRow, "category_id") ?? index}-${index}`}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        {index === 0 ? "Category" : index === 1 ? "Subcategory" : `Category ${index + 1}`}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-mono text-xs">
                        {getRecordText(categoryRow, "category_id") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(categoryRow, "category_name") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {String(categoryRow.is_primary_category ?? "")}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(categoryRow, "sort_order") ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">geo_codes</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">geo_code_name</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">geo_code_id</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">parent_id</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">sort_order</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">external_reference</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedFeed?.account.geo_codes.map((geoCode, index) => (
                    <tr key={`${getRecordText(geoCode, "geo_code_id") ?? index}-${index}`}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        {getRecordText(geoCode, "geo_code_name") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-mono text-xs">
                        {getRecordText(geoCode, "geo_code_id") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(geoCode, "parent_id") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(geoCode, "sort_order") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {String(geoCode.external_reference ?? "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">Joined Meeting Rooms</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Room</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Sq. Ft.</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Banquet</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Classroom</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Reception</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Theater</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Join</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedFeed?.meetingRooms.map((room) => (
                    <tr key={room.detail_space_id}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        {room.roomname}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.sqft}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.banquet}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.classroom}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.reception}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.theater}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-mono text-xs">
                        detail_id {room.detail_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <pre className="mt-5 max-h-96 overflow-auto border border-[#d9d0bd] bg-[#1f211d] p-4 text-xs leading-5 text-[#f5f1e8]">
            {formatPayload(consolidatedFeed)}
          </pre>
        </article>

        <article id="contentful-field-list" className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
              Contentful Field List
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Live-derived import plan for Contentful
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#625c52]">
              This includes top-level listing fields, nested account detail fields like AccessNow, and meeting space fields from the joined live feed.
            </p>
          </div>

          <div className="mt-5 overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="text-[#625c52]">
                <tr>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Contentful field ID</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Contentful type</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">iDSS source path</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">group</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">source</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">sample</th>
                </tr>
              </thead>
              <tbody>
                {contentfulRows.map((row) => (
                  <tr key={`${row.group}-${row.field}`}>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.contentfulFieldId}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-medium">
                      {row.contentfulType}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.field}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top">
                      {row.group}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.source}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top text-xs text-[#5d584f]">
                      {row.sample ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div id="raw-endpoints" className="grid gap-5">
          {results.map((result) => (
            <article
              key={result.path}
              className="border border-[#cfc6b4] bg-white/80 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {result.name}
                    </h2>
                    <span
                      className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        result.ok
                          ? "border-[#91a66f] bg-[#eef5df] text-[#3f5f22]"
                          : "border-[#d59a7a] bg-[#fff0e8] text-[#8b3f20]"
                      }`}
                    >
                      {result.ok ? "OK" : "Needs attention"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#625c52]">
                    {result.description}
                  </p>
                </div>

                <dl className="grid gap-2 text-sm text-[#5d584f] sm:grid-cols-3 lg:min-w-[360px]">
                  <div>
                    <dt className="font-semibold text-[#20201d]">Status</dt>
                    <dd>
                      {result.status
                        ? `${result.status} ${result.statusText ?? ""}`.trim()
                        : "No response"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#20201d]">Time</dt>
                    <dd>{result.durationMs}ms</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#20201d]">Path</dt>
                    <dd className="break-all font-mono text-xs">{result.path}</dd>
                  </div>
                </dl>
              </div>

              {result.error ? (
                <p className="mt-5 border border-[#d59a7a] bg-[#fff8f2] p-4 text-sm text-[#8b3f20]">
                  {result.error}
                </p>
              ) : (
                <pre className="mt-5 max-h-80 overflow-auto border border-[#d9d0bd] bg-[#1f211d] p-4 text-xs leading-5 text-[#f5f1e8]">
                  {formatPayload(result.payload)}
                </pre>
              )}
            </article>
          ))}
        </div>

        <article id="merge-map" className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
              Merge Map
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Three endpoints to old listing shape
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#625c52]">
              Use this as the comparison guide: the old listing is a merged target shape, not a single endpoint response. Listing data, account detail fields, and space records each contribute different sections.
            </p>
          </div>

          <div className="mt-5 overflow-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="text-[#625c52]">
                <tr>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Old listing field</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Source endpoint</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Source path / lookup</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Merge note</th>
                </tr>
              </thead>
              <tbody>
                {mappingRows.map((row) => (
                  <tr key={row.oldField}>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.oldField}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-medium">
                      {row.source}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.sourcePath}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top text-[#5d584f]">
                      {row.transform}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article id="old-listing" className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
                Old Listing
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {oldListing.company}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#625c52]">
                {oldListing.description}
              </p>
            </div>

            <dl className="grid gap-2 text-sm text-[#5d584f] sm:grid-cols-3 lg:min-w-[360px]">
              <div>
                <dt className="font-semibold text-[#20201d]">Record</dt>
                <dd>{oldListing.recid}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">Media</dt>
                <dd>{oldListing.media.length}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">Rooms</dt>
                <dd>{oldListing.meetingrooms.length}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">Summary</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">Address</dt>
                  <dd>{oldListing.address1}, {oldListing.city}, {oldListing.state} {oldListing.zip}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Category</dt>
                  <dd>
                    {oldListing.categories[0].catname} - {oldListing.categories[0].subcatname}
                    <span className="block text-xs">
                      catid {oldListing.categories[0].catid}, subcatid {oldListing.categories[0].subcatid}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Contact</dt>
                  <dd>{oldListing.fullname}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Email</dt>
                  <dd className="break-all">{oldListing.contact_email}</dd>
                </div>
              </dl>
            </section>

            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">Meeting Facility</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">Total Sq. Ft.</dt>
                  <dd>{oldListing.meetingfacility.totalsqft}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Largest Room</dt>
                  <dd>{oldListing.meetingfacility.largestroom}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Meeting Rooms</dt>
                  <dd>{oldListing.meetingfacility.numrooms}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Guest Capacity</dt>
                  <dd>{oldListing.meetingfacility.additional_object.guestcapacity.value}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">Media</h3>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {oldListing.media.map((image) => (
                <a
                  key={image.mediaid}
                  href={image.mediaurl}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-[#d9d0bd] bg-white p-3 text-[#20201d] hover:bg-[#f5f1e8]"
                >
                  <span className="font-semibold">{image.sortorder}. {image.medianame}</span>
                  <span className="mt-1 block break-all text-xs text-[#625c52]">
                    {image.mediaurl}
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">Meeting Rooms</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Room</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Sq. Ft.</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Banquet</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Classroom</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Reception</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Theater</th>
                  </tr>
                </thead>
                <tbody>
                  {oldListing.meetingrooms.map((room) => (
                    <tr key={room.roomid}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        {room.roomname}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.sqft}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.banquet}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.classroom}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.reception}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.theater}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <pre className="mt-5 max-h-96 overflow-auto border border-[#d9d0bd] bg-[#1f211d] p-4 text-xs leading-5 text-[#f5f1e8]">
            {formatPayload(oldListing)}
          </pre>
        </article>
      </section>
      </main>
  );
}
