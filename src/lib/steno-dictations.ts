export type StenoDictation = {
  id: string;
  title: string;
  english: string;
  hindi: string;
  topic?: string;
};

export const stenoDictations: StenoDictation[] = [
  {
    id: "1",
    title: "Legal matter",
    english:
      "The learned counsel for the petitioner submitted that the impugned order was passed without giving the petitioner an opportunity of being heard. The bench observed that a reasoned order is required before any adverse action is taken, and directed the authority to decide the representation afresh within four weeks.",
    hindi:
      "याचिकाकर्ता की ओर से यह कहा गया कि विवादित आदेश बिना सुनवाई का अवसर दिए पारित किया गया। पीठ ने कहा कि कोई प्रतिकूल कार्रवाई करने से पहले कारण बताना आवश्यक है, और प्राधिकरण को चार सप्ताह में अभ्यावेदन पर नए सिरे से निर्णय लेने का निर्देश दिया।",
  },
  {
    id: "2",
    title: "Parliament speech",
    english:
      "Honourable members, the bill before the House seeks to shorten the time taken to fill vacant posts in government offices. It asks every department to publish a calendar of examinations and to declare results within a fixed period, so that candidates are not left waiting without information.",
    hindi:
      "माननीय सदस्यगण, यह विधेयक सरकारी कार्यालयों में खाली पदों को भरने में लगने वाला समय कम करना चाहता है। इसमें हर विभाग से परीक्षाओं का कैलेंडर प्रकाशित करने और एक निश्चित अवधि में परिणाम घोषित करने को कहा गया है।",
  },
  {
    id: "3",
    title: "General article",
    english:
      "A public park is useful only when it is looked after. Visitors need drinking water, working lights and clean paths. When these are missing, families stop coming, and the open ground turns into a place people avoid after dark. A small, regular staff can keep the park fit for daily use.",
    hindi:
      "सार्वजनिक पार्क तभी उपयोगी है जब उसकी देखभाल होती रहे। आगंतुकों को पीने का पानी, काम करती रोशनी और साफ रास्ते चाहिए। जब ये नहीं होते, तो परिवार आना छोड़ देते हैं और शाम के बाद लोग उस जगह से बचने लगते हैं।",
  },
];
