/* Bilingual copy. Every user-visible string lives here, keyed by data-i18n.
   Values may contain inline HTML (<em>, <strong>, <code>, <a>). */

export const STRINGS = {
  en: {
    "meta.title": "An Alignment Angle Is All You Need: GSVD for dataset comparison",
    "meta.desc": "Comparing two datasets through their geometry: the GSVD gives a joint frame, and a single angle θ(z) says whether a sample is better explained by one dataset, the other, or both.",

    "nav.idea": "The idea",
    "nav.machine": "GSVD",
    "nav.play": "Playground",
    "nav.results": "Results",
    "nav.geometry": "Why 45° matters",
    "nav.next": "What's next",
    "nav.code": "Code",
    "nav.langTitle": "Ver em português",
    "nav.theme": "Theme",

    "hero.venue": "ICLR 2026 · PMLR v326",
    "hero.title": "Two datasets.<br>One <em>angle</em>.",
    "hero.sub": "Most methods compare two datasets with a single number. We compare them with a geometry, and read off one interpretable angle <span class='eq-inline'>θ(z)</span> for every sample.",
    "hero.authorsLabel": "",
    "hero.affil": "Institute of Computing, Federal University of Rio de Janeiro (UFRJ)",
    "hero.paper": "Paper (PMLR)",
    "hero.arxiv": "arXiv",
    "hero.code": "Code",
    "hero.lib": "Python library",
    "hero.linkedin": "LinkedIn",
    "hero.dialCaption": "Drag the needle. θ = 0° means the sample is explained more economically by dataset A; θ = 90° by dataset B; θ = 45° means both explain it equally well.",
    "hero.dialA": "more A",
    "hero.dialB": "more B",
    "hero.dialShared": "shared",

    "problem.eyebrow": "The problem",
    "problem.title": "A single number hides where the answer came from",
    "problem.p1": "Ask how similar two datasets are and the standard tools (CKA, SVCCA, MMD, FID) hand back one scalar per pair. That scalar is a real summary, and it is often the right thing to report. But it cannot tell you which directions of the feature space carry the agreement, which structure belongs to only one of the datasets, or which individual samples are driving the number.",
    "problem.p2": "This becomes a problem as soon as you want to act on the comparison. In transfer learning, knowing that a source domain resembles the target is not enough: you need to know which parts of it are worth carrying over and which will hurt. A single scalar cannot answer that.",
    "problem.cardTitle": "What each view gives you",
    "problem.rowMetric": "Global similarity score",
    "problem.rowOurs": "Alignment angle θ(z)",
    "problem.f1": "One number per dataset pair",
    "problem.f2": "One number per sample",
    "problem.f3": "Named, visualizable directions",
    "problem.f4": "Says which samples are ambiguous",
    "problem.f5": "Invariant to re-parameterization",
    "problem.yes": "yes",
    "problem.no": "no",
    "problem.note": "The two views are complementary, not competing. We report CKA alongside θ throughout, as a reference point rather than a baseline we try to beat.",

    "idea.eyebrow": "The idea",
    "idea.title": "Ax = By = z",
    "idea.p1": "Put both datasets in the same ambient space. Let <span class='eq-inline'>A</span> and <span class='eq-inline'>B</span> be matrices whose columns are observations. Now pick any vector <span class='eq-inline'>z</span> that <em>both</em> can produce, and ask a single question:",
    "idea.quote": "How expensive is it to build z out of A, compared to building the same z out of B?",
    "idea.p2": "Each side answers with a coefficient vector, <span class='eq-inline'>x</span> for A and <span class='eq-inline'>y</span> for B, and we take the smallest one each side can offer. The ratio of their norms is the whole score. An arctangent turns that ratio into a bounded, symmetric angle.",
    "idea.p3": "No sample correspondences are needed, no invertible map between domains, no training. The relation <span class='eq-inline'>Ax = By = z</span> is the entire primitive.",
    "idea.demoTitle": "Drag z",
    "idea.demoHint": "Two subspaces in the plane. Move the point z and watch the two representation costs, and the angle, respond.",
    "idea.costA": "cost via A",
    "idea.costB": "cost via B",
    "idea.mathSummary": "See the definition",
    "idea.mathBody": "<p>For a sample <span class='eq-inline'>z</span> in <span class='eq-inline'>col(A) ∩ col(B)</span>, the co-span fiber is the set of all compatible coefficient pairs:</p><div class='eq'>R(z) = { (x, y) : Ax = By = z }</div><p>Taking the minimum-norm representative on each side (that is, <span class='eq-inline'>x ⊥ Ker(A)</span> and <span class='eq-inline'>y ⊥ Ker(B)</span>) makes the two costs canonical, and the alignment angle is</p><div class='eq'>θ(z) = arctan( ‖x‖₂ / ‖y‖₂ ) ∈ [0, π/2]</div><p>Equal costs give θ = π/4. The arctan is what bounds the score and makes it symmetric under swapping A and B: the swap sends θ to π/2 − θ.</p>",

    "machine.eyebrow": "GSVD: The machine",
    "machine.title": "The GSVD hands you the coordinate system",
    "machine.p1": "Computing that angle by brute force for every sample would be hopeless. The Generalized Singular Value Decomposition does the work once, up front: it factors both matrices against a shared frame.",
    "machine.p2": "<span class='eq-inline'>H</span> is the shared ambient reference frame. The diagonal factors <span class='eq-inline'>C</span> and <span class='eq-inline'>S</span> say how strongly each direction of that frame belongs to A or to B, and since <span class='eq-inline'>CᵀC + SᵀS = I</span>, each direction carries a single cosine/sine pair. That pair is an angle, already sitting in the decomposition rather than approximated from it.",
    "machine.blocksTitle": "The block structure is the whole story",
    "machine.blockA": "A-only",
    "machine.blockShared": "shared",
    "machine.blockB": "B-only",
    "machine.blocksCaption": "C and S are padded with identity and zero blocks. The first block (C = I, S = 0) holds directions only A can produce; the last (C = 0, S = I) only B. Everything interesting lives in the middle block, where both cosine and sine are strictly positive and the angle sweeps continuously from 0° to 90°.",
    "machine.sliderTitle": "Walk the shared frame",
    "machine.sliderHint": "Every column of H is a direction with its own angle. Drag through them: the frame starts at the most A-like direction and ends at the most B-like one, passing through the structure the two datasets share.",
    "machine.dirLabel": "Direction",
    "machine.of": "of",
    "machine.pairLabel": "Dataset pair",
    "machine.loading": "loading the shared frame…",
    "machine.extremesNote": "The endpoints are not found by search. The paper proves that the maximizer and minimizer of θ are specific columns of H, namely <span class='eq-inline'>h₍ᵣ₊ₖ₎</span> and <span class='eq-inline'>h₍ᵣ₊₁₎</span>, so the same decomposition that scores samples also hands you the extreme directions in closed form.",
    "machine.mathSummary": "See the closed form",
    "machine.mathBody": "<p>The GSVD of a matrix pair sharing a row dimension gives</p><div class='eq'>A = H C U,&nbsp;&nbsp; B = H S V,&nbsp;&nbsp; CᵀC + SᵀS = I</div><p>with U and V orthogonal. Project a sample into the shared frame with <span class='eq-inline'>c(z) = H†z</span>, then the two representation costs are read off the diagonal factors:</p><div class='eq'>θ(z) = arctan( ‖C† c(z)‖₂ / ‖S† c(z)‖₂ )</div><p>This is the paper's first theorem: the GSVD-frame expression coincides with the minimum-norm definition. Computationally the decomposition costs O(d³) once, and every sample afterwards costs a matrix–vector product, which is why the demo below can score your drawing in real time.</p>",

    "play.eyebrow": "Playground",
    "play.title": "Draw a digit. Watch the angle move.",
    "play.p1": "Everything below runs on the real decomposition. The GSVD was computed offline with the <code>gsvdlib</code> pipeline and the resulting frame shipped to your browser, which evaluates the closed form as you draw, reproducing the library's own angles to within 0.02°.",
    "play.pairLabel": "Dataset pair",
    "play.drawTitle": "Your input",
    "play.drawHint": "Draw with the mouse or your finger. Thick strokes, centered, like an MNIST digit.",
    "play.clear": "Clear",
    "play.random": "Random test sample",
    "play.verdict": "Reads as",
    "play.emptyVerdict": "draw something",
    "play.histTitle": "Where you landed",
    "play.histHint": "The two class-conditional distributions of θ over the full test set. Your drawing is the marker. Click any bar to see the test images that fell in it.",
    "play.binTitle": "Test samples in this bin",
    "play.binHint": "Click a bar in the histogram above.",
    "play.binOf": "images with θ between",
    "play.and": "and",
    "play.overlapNote": "The overlap in the middle is the measurement. Samples near 45° are the ones both subspaces explain equally well, and the histogram tells you which ones they are.",
    "play.axisTheta": "θ (degrees)",
    "play.axisCount": "test samples",
    "play.loading": "loading the decomposition…",
    "play.error": "Could not load the data files. If you are opening this page directly from disk, serve it over HTTP instead (<code>python -m http.server</code>).",

    "results.eyebrow": "Results",
    "results.title": "The angle tracks the geometry",
    "results.p1": "Thresholding θ at 45° gives a classifier. It is not a competitive one, and it is not the point of the work, but it is a fair readout of how separable the two subspaces are. Across MNIST digit pairs, accuracy falls as the pair's geometric overlap rises.",
    "results.p2": "The pair 4 vs 9 is the interesting one. It has by far the highest CKA of the four, its θ histograms overlap most visibly around 45°, and it is the hardest to separate, so the three views agree with each other.",
    "results.tableTitle": "MNIST, published results",
    "results.scatterTitle": "Accuracy against geometric overlap",
    "results.scatterCaption": "Each point is a digit pair. As the two class subspaces overlap more (higher CKA), the angle separates them less. The diagnostic degrades smoothly, and for a legible reason.",
    "results.colPair": "Pair",
    "results.colAcc": "Accuracy",
    "results.colCka": "CKA",
    "results.colF1a": "F₁ (A)",
    "results.colF1b": "F₁ (B)",
    "results.axisCka": "linear CKA (subspace overlap)",
    "results.axisAcc": "classification accuracy",
    "results.fashionNote": "Fashion-MNIST behaves the same way and is included in the playground above: T-shirt vs Sneaker separates cleanly (97.2%), Pullover vs Dress does not (91.2%).",
    "results.reproNote": "Published numbers, from the paper. The playground recomputes everything from a fresh random draw of training columns, so its figures sit within about a point of these.",

    "geom.eyebrow": "Why 45° matters",
    "geom.title": "The angle is already a probability",
    "geom.p1": "θ comes out of pure linear algebra, from norms of coefficient vectors, and it turns out to carry a statistical meaning for free. Reading inverse squared costs as evidence gives a posterior over the two datasets:",
    "geom.p2": "Under this model, the Fisher–Rao distance between the posteriors of two samples is <span class='eq-inline'>2|θ(z) − θ(z′)|</span>. Up to a factor of two, the angle is not merely like a distance in the space of beliefs; it is that distance.",
    "geom.p3": "Lift this from samples to whole histograms and a second result appears: the Fisher–Rao distance between the two class-conditional θ-distributions decreases monotonically with the expected posterior standard deviation. Bins near 45° are where the posterior is closest to a coin flip, so they dominate the sum. That is the formal version of what your eye does when it looks at the overlap of two histograms.",
    "geom.takeaway": "Mass near 45° measures how much of the comparison stays ambiguous.",
    "geom.figCaption": "Posterior distributions induced by θ for four MNIST digit pairs. The pair 4 vs 9 piles up in the uncertain middle; the others commit.",
    "geom.mathSummary": "See the derivation",
    "geom.mathBody": "<p>Interpreting <span class='eq-inline'>1/a(z)²</span> and <span class='eq-inline'>1/b(z)²</span> as evidence for each dataset gives the parametric posterior</p><div class='eq'>P(A | θ) = cos²θ,&nbsp;&nbsp; P(B | θ) = sin²θ</div><p>Under the square-root (Bhattacharyya) embedding <span class='eq-inline'>ψ(θ) = (cos θ, sin θ)</span>, the Fisher–Rao distance between two induced posteriors collapses to</p><div class='eq'>d(p(z), p(z′)) = 2·acos( cos(θ(z) − θ(z′)) ) = 2|θ(z) − θ(z′)|</div><p>At the histogram level, with per-bin posteriors <span class='eq-inline'>rᵢ</span> and mixture weights <span class='eq-inline'>mᵢ</span>,</p><div class='eq'>d(P, Q) = 2·acos( E[ Std(Y | I) ] / √(π_A π_B) )</div><p>which is monotone decreasing in the expected posterior standard deviation. Bins with <span class='eq-inline'>rᵢ ≈ ½</span>, that is, θ near 45°, contribute the most and pull the two distributions together.</p>",

    "next.eyebrow": "What's next",
    "next.title": "From pixels to any learned representation",
    "next.p1": "The experiments here use raw pixels on purpose: every direction of the shared frame can be drawn as an image, so the geometry can be inspected instead of asserted. But nothing in the method is about images. A and B only need to be two matrices in a common ambient space, which is what word embeddings, audio features and the hidden layers of a modern encoder already give you.",
    "next.q1Title": "Transfer, by direction",
    "next.q1": "If A is a source domain and B a target, the shared block is a candidate set of transferable features, and the A-only block is where negative transfer would come from. Can the frame be used to rank directions before fine-tuning, rather than diagnosing after?",
    "next.q2Title": "Beyond pairs",
    "next.q2": "The GSVD is inherently binary. Three or more domains need either aggregated pairwise angles or a properly multiway construction.",
    "next.q3Title": "Robustness",
    "next.q3": "How sensitive is θ to rank truncation, preprocessing and noise, and what is the right behaviour when z falls outside the intersection of the two column spaces?",
    "next.personalTitle": "A personal note",
    "next.personal": "I am Eduarda. I work as an AI researcher on Brazilian Portuguese speech synthesis, and I am curious about what this geometry would say about voice. If you work on speech or on representation learning, I would like to hear what you would try first, including which of the questions above you think is a dead end.",
    "next.contact": "Email me",
    "next.contactsTitle": "Contact",
    "next.contactsNote": "Federal University of Rio de Janeiro (UFRJ).",
    "next.author1": "Eduarda de Souza Marques",
    "next.author2": "Arthur Sobrinho Ferreira da Rocha",
    "next.author3": "João Paixão",
    "next.author4": "Heudson Mirandola",
    "next.author5": "Daniel Sadoc Menasché",

    "code.eyebrow": "Code",
    "code.title": "Both implementations are open",
    "code.libTitle": "gsvdlib (Python)",
    "code.libP": "A NumPy/SciPy port of the original pipeline. SciPy does not expose LAPACK's <code>ggsvd3</code>, so the factorization is rebuilt from the Paige–Saunders construction (pivoted QR plus a CS decomposition) and validated against the Julia/LAPACK reference to 1e-13. Nothing in it is MNIST-specific: any matrix with labels works through the <code>VectorDataset</code> protocol, and the plotting layer takes pluggable renderers.",
    "code.jlTitle": "gsvd-alignment-angle (Julia)",
    "code.jlP": "The original experiment repository behind the paper: the GSVD preprocessing, the angle scoring, the distribution plots and the reconstruction of representative directions.",
    "code.snippetTitle": "Six lines",
    "code.wantMore": "To run it on your own matrices, the library is the fastest path. It takes any array with labels, not just images.",

    "cite.title": "Citation",
    "cite.copy": "Copy BibTeX",
    "cite.copied": "Copied",

    "footer.built": "Research carried out at the Institute of Computing, UFRJ.",
    "footer.thanks": "Thanks to Júlia Motta for her contribution to the experimental pipeline.",
    "footer.source": "Site source",
  },

  pt: {
    "meta.title": "Um ângulo de alinhamento é tudo o que você precisa: GSVD para comparar datasets",
    "meta.desc": "Comparar dois conjuntos de dados pela geometria: o GSVD fornece um sistema de coordenadas conjunto e um único ângulo θ(z) diz se uma amostra é melhor explicada por um dataset, pelo outro, ou por ambos.",

    "nav.idea": "A ideia",
    "nav.machine": "GSVD",
    "nav.play": "Interativo",
    "nav.results": "Resultados",
    "nav.geometry": "Por que 45°",
    "nav.next": "Próximos passos",
    "nav.code": "Código",
    "nav.langTitle": "View in English",
    "nav.theme": "Tema",

    "hero.venue": "ICLR 2026 · PMLR v326",
    "hero.title": "Dois datasets.<br>Um <em>ângulo</em>.",
    "hero.sub": "A maioria dos métodos compara dois conjuntos de dados com um único número. Nós os comparamos por uma geometria, e lemos um ângulo interpretável <span class='eq-inline'>θ(z)</span> para cada amostra.",
    "hero.authorsLabel": "",
    "hero.affil": "Instituto de Computação, Universidade Federal do Rio de Janeiro (UFRJ)",
    "hero.paper": "Artigo (PMLR)",
    "hero.arxiv": "arXiv",
    "hero.code": "Código",
    "hero.lib": "Biblioteca Python",
    "hero.linkedin": "LinkedIn",
    "hero.dialCaption": "Arraste o ponteiro. θ = 0° significa que a amostra é representada de forma mais econômica pelo dataset A; θ = 90°, pelo dataset B; θ = 45° significa que os dois a explicam igualmente bem.",
    "hero.dialA": "mais A",
    "hero.dialB": "mais B",
    "hero.dialShared": "compartilhado",

    "problem.eyebrow": "O problema",
    "problem.title": "Um número só esconde de onde veio a resposta",
    "problem.p1": "Pergunte o quão parecidos são dois datasets e as ferramentas usuais (CKA, SVCCA, MMD, FID) devolvem um escalar por par. Esse escalar é um resumo legítimo, e muitas vezes é o que se quer reportar. Mas ele não diz quais direções do espaço de atributos carregam a semelhança, qual estrutura pertence a apenas um dos datasets, nem quais amostras estão puxando o número.",
    "problem.p2": "Isso começa a pesar quando você quer <em>agir</em> a partir da comparação. Em transfer learning, saber que o domínio de origem é parecido com o de destino não basta: é preciso saber quais partes vale a pena levar e quais vão atrapalhar. Um escalar sozinho não responde isso.",
    "problem.cardTitle": "O que cada visão entrega",
    "problem.rowMetric": "Escore global de similaridade",
    "problem.rowOurs": "Ângulo de alinhamento θ(z)",
    "problem.f1": "Um número por par de datasets",
    "problem.f2": "Um número por amostra",
    "problem.f3": "Direções nomeáveis e visualizáveis",
    "problem.f4": "Diz quais amostras são ambíguas",
    "problem.f5": "Invariante a reparametrização",
    "problem.yes": "sim",
    "problem.no": "não",
    "problem.note": "As duas visões são complementares, não concorrentes. Reportamos CKA ao lado de θ o tempo todo, como ponto de referência e não como baseline a ser batido.",

    "idea.eyebrow": "A ideia",
    "idea.title": "Ax = By = z",
    "idea.p1": "Coloque os dois datasets no mesmo espaço ambiente. Sejam <span class='eq-inline'>A</span> e <span class='eq-inline'>B</span> matrizes cujas colunas são observações. Agora escolha um vetor <span class='eq-inline'>z</span> que <em>ambos</em> conseguem produzir e faça uma única pergunta:",
    "idea.quote": "Quão caro é construir z a partir de A, comparado a construir o mesmo z a partir de B?",
    "idea.p2": "Cada lado responde com um vetor de coeficientes, <span class='eq-inline'>x</span> para A e <span class='eq-inline'>y</span> para B, e tomamos o menor que cada lado consegue oferecer. A razão entre as normas já é o escore. Uma arcotangente transforma essa razão num ângulo limitado e simétrico.",
    "idea.p3": "Não são necessárias correspondências entre amostras, nem um mapa invertível entre domínios, nem treinamento. A relação <span class='eq-inline'>Ax = By = z</span> é tudo de que o método precisa.",
    "idea.demoTitle": "Arraste z",
    "idea.demoHint": "Dois subespaços no plano. Mova o ponto z e veja os dois custos de representação, e o ângulo, responderem.",
    "idea.costA": "custo via A",
    "idea.costB": "custo via B",
    "idea.mathSummary": "Ver a definição",
    "idea.mathBody": "<p>Para uma amostra <span class='eq-inline'>z</span> em <span class='eq-inline'>col(A) ∩ col(B)</span>, a fibra co-span é o conjunto de todos os pares de coeficientes compatíveis:</p><div class='eq'>R(z) = { (x, y) : Ax = By = z }</div><p>Tomar o representante de norma mínima de cada lado (isto é, <span class='eq-inline'>x ⊥ Ker(A)</span> e <span class='eq-inline'>y ⊥ Ker(B)</span>) torna os dois custos canônicos, e o ângulo de alinhamento é</p><div class='eq'>θ(z) = arctan( ‖x‖₂ / ‖y‖₂ ) ∈ [0, π/2]</div><p>Custos iguais dão θ = π/4. A arcotangente é o que limita o escore e o torna simétrico ao trocar A e B: a troca leva θ em π/2 − θ.</p>",

    "machine.eyebrow": "GSVD: A máquina",
    "machine.title": "O GSVD entrega o sistema de coordenadas",
    "machine.p1": "Calcular esse ângulo por força bruta para cada amostra seria inviável. A Decomposição em Valores Singulares Generalizada faz o trabalho uma vez, de antemão: ela fatora as duas matrizes contra um referencial compartilhado.",
    "machine.p2": "<span class='eq-inline'>H</span> é o referencial ambiente compartilhado. Os fatores diagonais <span class='eq-inline'>C</span> e <span class='eq-inline'>S</span> dizem o quanto cada direção desse referencial pertence a A ou a B e, como <span class='eq-inline'>CᵀC + SᵀS = I</span>, cada direção carrega um único par cosseno/seno. Esse par é um ângulo, que já está na decomposição em vez de ser aproximado a partir dela.",
    "machine.blocksTitle": "A estrutura de blocos é a história toda",
    "machine.blockA": "só A",
    "machine.blockShared": "compartilhado",
    "machine.blockB": "só B",
    "machine.blocksCaption": "C e S são preenchidos com blocos identidade e zero. O primeiro bloco (C = I, S = 0) guarda direções que só A produz; o último (C = 0, S = I), só B. Tudo o que interessa está no bloco do meio, onde cosseno e seno são estritamente positivos e o ângulo varre continuamente de 0° a 90°.",
    "machine.sliderTitle": "Percorra o referencial compartilhado",
    "machine.sliderHint": "Cada coluna de H é uma direção com seu próprio ângulo. Percorra-as: o referencial começa na direção mais parecida com A e termina na mais parecida com B, passando no meio pela estrutura que os dois datasets dividem.",
    "machine.dirLabel": "Direção",
    "machine.of": "de",
    "machine.pairLabel": "Par de datasets",
    "machine.loading": "carregando o referencial compartilhado…",
    "machine.extremesNote": "Os extremos não são encontrados por busca. O artigo prova que o maximizador e o minimizador de θ são colunas específicas de H, a saber <span class='eq-inline'>h₍ᵣ₊ₖ₎</span> e <span class='eq-inline'>h₍ᵣ₊₁₎</span>, de modo que a mesma decomposição que pontua amostras também entrega as direções extremas em forma fechada.",
    "machine.mathSummary": "Ver a forma fechada",
    "machine.mathBody": "<p>O GSVD de um par de matrizes que compartilham a dimensão de linhas dá</p><div class='eq'>A = H C U,&nbsp;&nbsp; B = H S V,&nbsp;&nbsp; CᵀC + SᵀS = I</div><p>com U e V ortogonais. Projetando uma amostra no referencial compartilhado com <span class='eq-inline'>c(z) = H†z</span>, os dois custos de representação são lidos diretamente dos fatores diagonais:</p><div class='eq'>θ(z) = arctan( ‖C† c(z)‖₂ / ‖S† c(z)‖₂ )</div><p>Esse é o primeiro teorema do artigo: a expressão no referencial do GSVD coincide com a definição por norma mínima. Computacionalmente, a decomposição custa O(d³) uma vez, e cada amostra depois custa um produto matriz–vetor, que é o motivo de o demo abaixo conseguir pontuar seu desenho em tempo real.</p>",

    "play.eyebrow": "Interativo",
    "play.title": "Desenhe um dígito. Veja o ângulo se mover.",
    "play.p1": "Tudo abaixo roda sobre a decomposição real. O GSVD foi calculado offline com o pipeline da <code>gsvdlib</code> e o referencial resultante foi enviado ao seu navegador, que avalia a forma fechada enquanto você desenha e reproduz os ângulos da própria biblioteca dentro de 0,02°.",
    "play.pairLabel": "Par de datasets",
    "play.drawTitle": "Sua entrada",
    "play.drawHint": "Desenhe com o mouse ou com o dedo. Traços grossos, centralizados, como um dígito do MNIST.",
    "play.clear": "Limpar",
    "play.random": "Amostra de teste aleatória",
    "play.verdict": "Lido como",
    "play.emptyVerdict": "desenhe algo",
    "play.histTitle": "Onde você caiu",
    "play.histHint": "As duas distribuições condicionais de θ sobre o conjunto de teste completo. Seu desenho é o marcador. Clique em qualquer barra para ver as imagens de teste que caíram nela.",
    "play.binTitle": "Amostras de teste nesta faixa",
    "play.binHint": "Clique em uma barra do histograma acima.",
    "play.binOf": "imagens com θ entre",
    "play.and": "e",
    "play.overlapNote": "A sobreposição no meio é a medição. As amostras perto de 45° são as que os dois subespaços explicam igualmente bem, e o histograma mostra quais são.",
    "play.axisTheta": "θ (graus)",
    "play.axisCount": "amostras de teste",
    "play.loading": "carregando a decomposição…",
    "play.error": "Não foi possível carregar os arquivos de dados. Se você abriu esta página direto do disco, sirva-a por HTTP (<code>python -m http.server</code>).",

    "results.eyebrow": "Resultados",
    "results.title": "O ângulo acompanha a geometria",
    "results.p1": "Cortar θ em 45° dá um classificador. Ele não é competitivo, e não é esse o ponto do trabalho, mas serve como leitura de quão separáveis são os dois subespaços. Nos pares de dígitos do MNIST, a acurácia cai à medida que a sobreposição geométrica do par aumenta.",
    "results.p2": "O par 4 vs 9 é o interessante. Tem de longe o maior CKA dos quatro, seus histogramas de θ se sobrepõem bastante em torno de 45° e é o mais difícil de separar, ou seja, as três visões concordam entre si.",
    "results.tableTitle": "MNIST, resultados publicados",
    "results.scatterTitle": "Acurácia contra sobreposição geométrica",
    "results.scatterCaption": "Cada ponto é um par de dígitos. Quanto mais os dois subespaços de classe se sobrepõem (CKA maior), menos o ângulo os separa. O diagnóstico piora de forma suave e por um motivo legível.",
    "results.colPair": "Par",
    "results.colAcc": "Acurácia",
    "results.colCka": "CKA",
    "results.colF1a": "F₁ (A)",
    "results.colF1b": "F₁ (B)",
    "results.axisCka": "CKA linear (sobreposição dos subespaços)",
    "results.axisAcc": "acurácia de classificação",
    "results.fashionNote": "O Fashion-MNIST se comporta da mesma forma e está incluído no interativo acima: camiseta vs tênis separa bem (97,2%), pulôver vs vestido não (91,2%).",
    "results.reproNote": "Números publicados, do artigo. O interativo recalcula tudo a partir de um novo sorteio aleatório das colunas de treino, então seus valores ficam a cerca de um ponto destes.",

    "geom.eyebrow": "Por que 45°",
    "geom.title": "O ângulo já é uma probabilidade",
    "geom.p1": "θ sai de álgebra linear pura, de normas de vetores de coeficientes, e acaba carregando um significado estatístico de graça. Ler custos quadráticos inversos como evidência dá uma posteriori sobre os dois datasets:",
    "geom.p2": "Sob esse modelo, a distância de Fisher–Rao entre as posterioris de duas amostras é <span class='eq-inline'>2|θ(z) − θ(z′)|</span>. A menos de um fator dois, o ângulo não é só parecido com uma distância no espaço de crenças; ele é essa distância.",
    "geom.p3": "Passando de amostras para histogramas inteiros, aparece um segundo resultado: a distância de Fisher–Rao entre as duas distribuições condicionais de θ decresce monotonicamente com o desvio-padrão esperado da posteriori. As faixas perto de 45° são as que mais se aproximam de um cara-ou-coroa, então dominam a soma. É a versão formal do que seu olho faz ao olhar a sobreposição de dois histogramas.",
    "geom.takeaway": "A massa perto de 45° mede quanto da comparação permanece ambíguo.",
    "geom.figCaption": "Distribuições a posteriori induzidas por θ para quatro pares de dígitos do MNIST. O par 4 vs 9 se acumula no meio incerto; os outros se comprometem.",
    "geom.mathSummary": "Ver a derivação",
    "geom.mathBody": "<p>Interpretar <span class='eq-inline'>1/a(z)²</span> e <span class='eq-inline'>1/b(z)²</span> como evidência para cada dataset dá a posteriori paramétrica</p><div class='eq'>P(A | θ) = cos²θ,&nbsp;&nbsp; P(B | θ) = sin²θ</div><p>Sob a imersão raiz quadrada (Bhattacharyya) <span class='eq-inline'>ψ(θ) = (cos θ, sin θ)</span>, a distância de Fisher–Rao entre duas posterioris induzidas colapsa para</p><div class='eq'>d(p(z), p(z′)) = 2·acos( cos(θ(z) − θ(z′)) ) = 2|θ(z) − θ(z′)|</div><p>No nível dos histogramas, com posterioris por faixa <span class='eq-inline'>rᵢ</span> e pesos da mistura <span class='eq-inline'>mᵢ</span>,</p><div class='eq'>d(P, Q) = 2·acos( E[ Std(Y | I) ] / √(π_A π_B) )</div><p>que é monotonicamente decrescente no desvio-padrão esperado da posteriori. Faixas com <span class='eq-inline'>rᵢ ≈ ½</span>, isto é, θ perto de 45°, contribuem mais e puxam as duas distribuições uma para a outra.</p>",

    "next.eyebrow": "Próximos passos",
    "next.title": "De pixels a qualquer representação aprendida",
    "next.p1": "Os experimentos aqui usam pixels brutos de propósito: cada direção do referencial compartilhado pode ser desenhada como imagem, então dá para inspecionar a geometria em vez de só afirmá-la. Mas nada no método é sobre imagens. A e B só precisam ser duas matrizes num espaço ambiente comum, que é o que embeddings de palavras, features de áudio e as camadas ocultas de um encoder moderno já oferecem.",
    "next.q1Title": "Transferência, por direção",
    "next.q1": "Se A é um domínio de origem e B o de destino, o bloco compartilhado é um conjunto candidato de features transferíveis, e o bloco só-A é de onde viria a transferência negativa. Dá para usar o referencial para ranquear direções <em>antes</em> do fine-tuning, em vez de diagnosticar depois?",
    "next.q2Title": "Além de pares",
    "next.q2": "O GSVD é inerentemente binário. Três ou mais domínios exigem ou a agregação de ângulos par a par, ou uma construção de fato multivia.",
    "next.q3Title": "Robustez",
    "next.q3": "Quão sensível é θ a truncamento de posto, pré-processamento e ruído? E qual é o comportamento correto quando z cai fora da interseção dos dois espaços-coluna?",
    "next.personalTitle": "Uma nota pessoal",
    "next.personal": "Eu sou a Eduarda. Trabalho como pesquisadora de IA em síntese de voz em português brasileiro e tenho curiosidade sobre o que esta geometria teria a dizer sobre voz. Se você trabalha com fala ou com aprendizado de representações, quero muito saber o que você tentaria primeiro, inclusive quais das perguntas acima você acha que são beco sem saída.",
    "next.contact": "Me escreva",
    "next.contactsTitle": "Contato",
    "next.contactsNote": "Universidade Federal do Rio de Janeiro (UFRJ).",
    "next.author1": "Eduarda de Souza Marques",
    "next.author2": "Arthur Sobrinho Ferreira da Rocha",
    "next.author3": "João Paixão",
    "next.author4": "Heudson Mirandola",
    "next.author5": "Daniel Sadoc Menasché",

    "code.eyebrow": "Código",
    "code.title": "As duas implementações são abertas",
    "code.libTitle": "gsvdlib (Python)",
    "code.libP": "Um port do pipeline original para NumPy/SciPy. A SciPy não expõe o <code>ggsvd3</code> do LAPACK, então a fatoração é reconstruída pela construção de Paige–Saunders (QR pivotado mais uma decomposição CS) e validada contra a referência Julia/LAPACK a 1e-13. Nada nela é específico do MNIST: qualquer matriz com rótulos funciona pelo protocolo <code>VectorDataset</code>, e a camada de plots aceita renderizadores plugáveis.",
    "code.jlTitle": "gsvd-alignment-angle (Julia)",
    "code.jlP": "O repositório original de experimentos por trás do artigo: o pré-processamento do GSVD, a pontuação por ângulo, os gráficos de distribuição e a reconstrução das direções representativas.",
    "code.snippetTitle": "Seis linhas",
    "code.wantMore": "Para rodar nas suas próprias matrizes, a biblioteca é o caminho mais rápido. Ela aceita qualquer array com rótulos, não só imagens.",

    "cite.title": "Como citar",
    "cite.copy": "Copiar BibTeX",
    "cite.copied": "Copiado",

    "footer.built": "Pesquisa realizada no Instituto de Computação, UFRJ.",
    "footer.thanks": "Agradecemos à Júlia Motta pela contribuição ao pipeline experimental.",
    "footer.source": "Código do site",
  },
};

/* Dataset class names come from the Python layer in English; the site shows
   them in the reader's language. */
const CLASS_NAMES_PT = {
  "T-shirt/top": "Camiseta/top", "Trouser": "Calça", "Pullover": "Pulôver",
  "Dress": "Vestido", "Coat": "Casaco", "Sandal": "Sandália",
  "Shirt": "Camisa", "Sneaker": "Tênis", "Bag": "Bolsa",
  "Ankle boot": "Bota",
};

export function className(name, lang) {
  if (lang !== "pt") return name;
  const digit = /^Digit (\d)$/.exec(name);
  if (digit) return `Dígito ${digit[1]}`;
  return CLASS_NAMES_PT[name] || name;
}

const STORAGE_KEY = "gsvd-lang";

export function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "pt") return saved;
  } catch (_) { /* private mode */ }
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("pt") ? "pt" : "en";
}

export function applyLang(lang) {
  const dict = STRINGS[lang] || STRINGS.en;
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  // the flag on the language toggle is chosen in CSS from this attribute
  document.documentElement.dataset.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key in dict) el.innerHTML = dict[key];
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    // format: "attr:key;attr:key"
    el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
      const [attr, key] = pair.split(":");
      if (key in dict) el.setAttribute(attr, dict[key]);
    });
  });

  document.title = dict["meta.title"];
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", dict["meta.desc"]);

  try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* ignore */ }
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

export function t(key, lang) {
  return (STRINGS[lang] || STRINGS.en)[key] ?? (STRINGS.en[key] ?? key);
}
