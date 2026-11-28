import type { FactPool } from './types';

export const centralFacts = {
  Bihar: [
    {
      text: 'Nalanda’s ruins include monasteries and shrines dating from the 3rd century BCE to the 13th century CE.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/1502/',
    },
    {
      text: 'The 50-metre Mahabodhi Temple is among India’s earliest surviving temples built entirely of brick.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/1056',
    },
    {
      text: 'Barabar’s Mauryan-era caves are considered India’s oldest surviving rock-cut structures.',
      source: 'Bihar Tourism',
      url: 'https://tourism.bihar.gov.in/en/destinations/jehanabad/barabar-caves',
    },
    {
      text: 'Valmiki is Bihar’s only tiger reserve and marks the eastern edge of India’s Himalayan Terai forests.',
      source: 'Bihar Tourism',
      url: 'https://tourism.bihar.gov.in/in/en/home/destinations/west-champaran/valmiki-tiger-reserve',
    },
  ],
  Chhattisgarh: [
    {
      text: 'At Chitrakote, the Indravati drops about 95 feet across a broad, horseshoe-shaped waterfall.',
      source: 'Chhattisgarh Tourism Board',
      url: 'https://tourism.cgstate.gov.in/destinations/Bastar/Chitrakote',
    },
    {
      text: 'Bastar Dussehra lasts 75 days and centres on Danteshwari, a goddess worshipped across the region.',
      source: 'Bastar District',
      url: 'https://bastar.gov.in/en/tourism/culture-heritage/',
    },
    {
      text: 'A vertical fissure opens into Kotumsar Cave, where seeping water feeds underground pools all year.',
      source: 'Bastar District',
      url: 'https://bastar.gov.in/en/tourist-place/kotumsar-cave/',
    },
    {
      text: 'Bastar Dhokra artisans cast brass, bell metal and bronze with the lost-wax method.',
      source: 'Incredible India',
      url: 'https://www.incredibleindia.gov.in/en/chhattisgarh/bastar-dhokra',
    },
  ],
  Jharkhand: [
    {
      text: 'Palamau was among India’s first nine tiger reserves, notified when Project Tiger began in 1973.',
      source: 'National Tiger Conservation Authority',
      url: 'https://ntca.gov.in/assets/uploads/Reports/MEE/MEE_TR_Report_2023.pdf',
    },
    {
      text: 'Jain tradition associates Parasnath, Jharkhand’s highest hill, with the liberation of 20 Tirthankaras.',
      source: 'Jharkhand Forest Department',
      url: 'https://forest.jharkhand.gov.in/know-your-division_hazaribaghwildlife.aspx',
    },
    {
      text: 'The Subarnarekha River plunges 98 metres at Hundru Falls, carving unusual rock formations below.',
      source: 'Jharkhand Tourism',
      url: 'https://tourism.jharkhand.gov.in/destinationDetails/95',
    },
    {
      text: 'Migratory birds winter at Udhwa Bird Sanctuary’s two lakes, the 155-hectare Pataura and the 410-hectare Berhale.',
      source: 'Jharkhand Forest Department',
      url: 'https://forest.jharkhand.gov.in/wings_wildlife_protectedarea_udhwa.aspx',
    },
  ],
  'Madhya Pradesh': [
    {
      text: 'Bhimbetka’s five clusters of sandstone shelters hold paintings spanning from the Mesolithic to historic periods.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/925',
    },
    {
      text: 'Sanchi’s stupas, temples and monasteries preserve Buddhist art and architecture from the 3rd century BCE to 12th CE.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/524',
    },
    {
      text: 'Around 20 Khajuraho temples survive across three clusters, representing both Hindu and Jain traditions.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/240/',
    },
    {
      text: 'Near Khajuraho, the Ken River has cut a 5-kilometre-long, 30-metre-deep canyon through pink-to-grey granite.',
      source: 'Chhatarpur District',
      url: 'https://chhatarpur.nic.in/en/tourist-place/raneh-fall/',
    },
  ],
  'Uttar Pradesh': [
    {
      text: 'The Taj Mahal’s tomb sits at the far end of its garden, creating a long view from the entrance.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/252/',
    },
    {
      text: 'Fatehpur Sikri served as the Mughal capital for only about 10 years before Akbar moved the court to Lahore.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/255/',
    },
    {
      text: 'Dudhwa’s monsoon elephant grass reaches 3–6 metres, sheltering rare Bengal floricans and hispid hares.',
      source: 'UP Eco-Tourism Board',
      url: 'https://upecoboard.up.gov.in/en/article/dudhwa-national-park',
    },
    {
      text: 'The Ashokan Lion Capital found at Sarnath, where the Buddha gave his first sermon, inspired India’s State Emblem.',
      source: 'Uttar Pradesh NRI Department',
      url: 'https://www.nri.up.gov.in/en/article/sarnath?brd=1',
    },
  ],
  Uttarakhand: [
    {
      text: 'Nanda Devi, India’s second-highest peak at 7,817 metres, is approached through the deep Rishi Ganga gorge.',
      source: 'UNESCO',
      url: 'https://whc.unesco.org/en/list/335',
    },
    {
      text: 'Corbett began in 1936 as Hailey National Park, India’s first national park and one of its first tiger reserves.',
      source: 'National Tiger Conservation Authority',
      url: 'https://ntca.gov.in/wp-content/uploads/2025/08/Faunal-Diversity-of-Tiger-Reserve-in-India-Vol-1.pdf',
    },
    {
      text: 'Asan’s 1967 barrage created bird habitat where 330 species have been recorded, including globally threatened birds.',
      source: 'Ramsar Sites Information Service',
      url: 'https://rsis.ramsar.org/RISapp/files/RISrep/IN2437RIS_2010_en.pdf',
    },
    {
      text: 'The Bhagirathi emerges at Gaumukh and takes the name Ganga where it meets the Alaknanda at Devprayag.',
      source: 'Uttarakhand Tourism',
      url: 'https://www.uttarakhandtourism.gov.in/destination/gangotri',
    },
  ],
} satisfies FactPool;
