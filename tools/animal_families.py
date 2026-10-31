# v5.2 Part 16: species name -> model family for the owner's world_animals.xlsx (dataset of record).
# Ordered rules: the first match wins, so the specific ("Sea Lion", "Lionfish", "Lion Tamarin") come before the general ("Lion").
import re
RULES = [
  # --- exceptions first (names that contain another animal's word) ---
  (r'tamarin|marmoset', 'primate'), (r'snub-nosed monkey|monkey|macaque|baboon|mandrill|drill$|^drill|colobus|langur|douc|guenon|mangabey|capuchin|howler|chimpanzee|bonobo|gorilla|orangutan|gibbon|gelada', 'primate'),
  (r'lemur|indri|aye-aye|tarsier', 'primate'),
  (r'sea eagle|fish eagle|hawk-eagle|eagle-owl', 'raptor'),
  (r'sea krait', 'snake'), (r'chameleon|iguana|gecko', 'lizard'), (r'sea turtle|ridley|leatherback|hawksbill', 'seaturtle'),
  (r'softshell turtle', 'turtle'),
  (r'fur seal|seal$|seal \(|monk seal', 'seal'),
  (r'killer whale|\borca\b', 'whale'), (r'whale shark|basking shark|shark', 'shark'),
  (r'vaquita', 'dolphin'), (r'whale', 'whale'), (r'dolphin|porpoise', 'dolphin'),
  (r'manatee|dugong', 'seacow'),
  (r'stingray|manta ray', 'ray'),
  (r'jellyfish', 'jelly'), (r'nautilus', 'octopus'), (r'conch', 'snail'), (r'coconut crab', 'crab'),
  (r'flying fish|cichlid|minnow|grouper|marlin|tuna|\bcarp\b|arapaima|sturgeon|coelacanth|hilsa|mandarin fish|fighting fish|coral trout', 'fish'),
  (r'olm', 'salamander'), (r'axolotl|salamander', 'salamander'),
  (r'frog|mountain chicken', 'frog'),
  (r'butterfly|birdwing|ladybug|beetle|honey bee', 'insect'),
  (r'flying fox|fruit bat|pipistrelle', 'bat'), (r'colugo|flying squirrel', 'glider'),
  (r'tree-kangaroo|kangaroo|wallaby|koala|wombat|tasmanian devil|cuscus|opossum', 'marsupial'),
  (r'platypus|echidna', 'monotreme'),
  (r'penguin', 'penguin'),
  (r'ostrich|emu$|rhea$|cassowary|kiwi$', 'ratite'),
  (r'flamingo|stork|crane$|crowned crane|ibis|spoonbill|heron|shoebill|secretarybird|bustard|lapwing|godwit', 'wader'),
  (r'swan|\bgoose\b|duck|\bteal\b|loon', 'waterfowl'),
  (r'eagle|falcon|kestrel|hawk|vulture|condor|goshawk|gyrfalcon|buzzard|\bowl\b|eagle-owl|morepork|shaheen|saker', 'raptor'),
  (r'parrot|macaw|amazon$|amazon \(|lory|lorikeet|parakeet|cockatoo|kakapo|kea$|shining-parrot|sisserou', 'parrot'),
  (r'pelican|booby|frigatebird|cormorant|shearwater|gull|tern$|noddy|puffin', 'seabird'),
  (r'peafowl|pheasant|peacock-pheasant|rooster|junglefowl|fireback|partridge|francolin|guineafowl|capercaillie|megapode|chachalaca|piping-guan|monal', 'fowl'),
  (r'toucan|toucanet|hornbill|hummingbird|coquette|carib$|streamertail|kingfisher|bird-of-paradise|cendrawasih|cock-of-the-rock|bellbird|quetzal|trogon|motmot|turaco|hoopoe|hoatzin|sunbird|robin|blackbird|thrush|nightingale|swallow|wagtail|wheatear|warbler|sparrow|serin|rosefinch|goldcrest|honeyeater|magpie|dove|pigeon|lark|palmchat|hornero|troupial|picathartes|dipper|rockjumper|rail$|waterhen|takahe|kookaburra', 'bird'),
  # --- mammals ---
  (r'red panda', 'smallmammal'), (r'giant panda', 'panda'),
  (r'bear', 'bear'),
  (r'raccoon dog|tanuki', 'canine'),
  (r'hyena', 'hyena'),
  (r'wolf|fox$|fox \(|jackal|wild dog|hunting dog|singing dog|hound|shepherd dog|chihuahua|bernard dog|sarplaninec|šarplaninec', 'canine'),
  (r'\blion\b|tiger|leopard|panther|jaguar|cheetah|puma|cougar|lynx|ocelot|caracal|wildcat|golden cat|geoffroy\'s cat|sand cat|fishing cat|angora cat', 'cat'),
  (r'fossa', 'smallcarnivore'), (r'genet|mongoose|meerkat', 'smallcarnivore'),
  (r'elephant', 'elephant'), (r'rhinoceros', 'rhino'), (r'hippopotamus', 'hippo'), (r'tapir', 'tapir'),
  (r'giraffe|okapi', 'giraffe'),
  (r'zebra$|horse|wild ass|onager|stallion', 'horse'),
  (r'camel|llama|alpaca|vicu|guanaco', 'camelid'),
  (r'bison|aurochs|buffalo|carabao|gaur|yak|cattle|kouprey|tamaraw|fighting bull|muskox|takin', 'bovine'),
  (r'\bboar\b|\bhog\b|peccary|babirusa|pig$|feral pig|mangalica', 'pig'),
  (r'moose|elk|reindeer|caribou|deer|stag|huemul|chital', 'deer'),
  (r'ibex|markhor|chamois|isard|tahr|tur$|goral|kri-kri|goat|mouflon|argali|sheep|bharal', 'goat'),
  (r'oryx|gemsbok|addax|gazelle|impala|springbok|wildebeest|eland|kudu|nyala|bongo|sable antelope|roan|kob|lechwe|sitatunga|duiker|gerenuk|blackbuck|saiga|rhebok|tiang|saola|royal antelope|antelope', 'antelope'),
  (r'beaver|marmot|capybara|chinchilla|agouti|hutia|coypu|nutria|porcupine|squirrel|dormouse|hamster|mouse', 'rodent'),
  (r'hare|rabbit', 'rabbit'),
  (r'otter shrew', 'smallmammal'), (r'giant otter|river otter', 'otter'), (r'otter', 'otter'),
  (r'badger|marten|kuna|sable$|weasel|wolverine|raccoon|hedgehog|solenodon|armadillo|anteater|pangolin|sloth|hyrax', 'smallmammal'),
  # --- reptiles ---
  (r'crocodile|alligator|caiman|gharial', 'croc'),
  (r'tortoise|turtle', 'turtle'),
  (r'cobra|python|boa|anaconda|racer|threadsnake|fer-de-lance|viper|mamba|snake', 'snake'),
  (r'iguana|gecko|monitor|komodo|chameleon|skink|lizard|tuatara', 'lizard'),
]
SEA = {'whale', 'dolphin', 'seal', 'seacow', 'shark', 'ray', 'seaturtle', 'jelly', 'octopus'}
FRESH = {'fish', 'salamander'}
def family(name):
  n = name.lower()
  for rx, f in RULES:
    if re.search(rx, n): return f
  return None
def habitat(name, fam):
  n = name.lower()
  if fam in SEA: return 'river' if re.search(r'river dolphin|amazon river|ganges|indus|irrawaddy|bolivian|pink river|baikal|caspian seal|saimaa', n) else 'sea'
  if fam == 'fish': return 'sea' if re.search(r'flying fish|grouper|marlin|tuna|coral trout|mandarin|coelacanth|hilsa', n) else 'river'
  if fam in ('salamander',): return 'river'
  if fam == 'otter' and 'giant' not in n and 'river' not in n: return 'coast'
  if fam in ('seabird', 'penguin') or re.search(r'marine iguana|coconut crab|conch|crab', n): return 'coast'
  return 'land'
