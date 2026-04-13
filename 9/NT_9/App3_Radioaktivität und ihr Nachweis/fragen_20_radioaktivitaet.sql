-- 20 Fragen aus den beiden Seiten in die DB einpflegen
-- Thema: Radioaktivität und ihr Nachweis

BEGIN;

DO $$
DECLARE
  v_topic_id INT;
BEGIN
  SELECT id INTO v_topic_id
  FROM topics
  WHERE title = 'Radioaktivität und ihr Nachweis' AND subject = 'NT'
  ORDER BY id
  LIMIT 1;

  IF v_topic_id IS NULL THEN
    INSERT INTO topics (title, subject)
    VALUES ('Radioaktivität und ihr Nachweis', 'NT')
    RETURNING id INTO v_topic_id;
  END IF;

  -- Vorhandene Fragen für das Thema ersetzen, damit keine Duplikate entstehen
  DELETE FROM questions WHERE topic_id = v_topic_id;

  INSERT INTO questions (
    topic_id, question_text, option_a, option_b, option_c, option_d, correct_option
  ) VALUES
  (v_topic_id, 'Welche Aussage zur natürlichen Radioaktivität ist richtig?', 'Sie gibt es nur in Kernkraftwerken.', 'Sie ist überall vorhanden, aber unterschiedlich stark.', 'Sie kommt nur im Weltall vor.', 'Sie ist in ganz Deutschland gleich.', 'B'),
  (v_topic_id, 'Woher kommt Bodenstrahlung hauptsächlich?', 'Aus Gesteinen mit Uran und Thorium.', 'Nur aus Wolken.', 'Nur aus Flüssen.', 'Nur aus Stromleitungen.', 'A'),
  (v_topic_id, 'In welchen Regionen ist die Bodenstrahlung oft höher?', 'In Regionen mit viel Sand.', 'In Regionen ohne Gestein.', 'In Regionen mit viel Granit.', 'Nur an der Küste.', 'C'),
  (v_topic_id, 'Was passiert mit der Höhenstrahlung, wenn die Höhe zunimmt?', 'Sie nimmt ab.', 'Sie bleibt immer gleich.', 'Sie nimmt zu.', 'Sie verschwindet ganz.', 'C'),
  (v_topic_id, 'Welche Rolle hat die Atmosphäre bei kosmischer Strahlung?', 'Sie schirmt einen Teil der Strahlung ab.', 'Sie verstärkt jede Strahlung.', 'Sie erzeugt immer neue Strahlung.', 'Sie hat keinen Einfluss.', 'A'),
  (v_topic_id, 'Wie entsteht die Eigenstrahlung des Menschen?', 'Nur durch Sonnenlicht.', 'Nur durch Wasser im Körper.', 'Durch aufgenommene natürliche radioaktive Stoffe.', 'Nur durch Sport.', 'C'),
  (v_topic_id, 'Welches Lebensmittel wird im Text als Beispiel für Eigenstrahlung genannt?', 'Apfel', 'Banane', 'Brot', 'Milch', 'B'),
  (v_topic_id, 'Wo wird künstliche Radioaktivität laut Text genutzt?', 'In Kernkraftwerken und in der Medizin.', 'Nur in Vulkanen.', 'Nur in Flugzeugen.', 'Nur im Straßenbau.', 'A'),
  (v_topic_id, 'In welchem Jahr entdeckte Henri Becquerel die Radioaktivität?', '1886', '1903', '1896', '1911', 'C'),
  (v_topic_id, 'Was zeigte die geschwärzte Fotoplatte bei Becquerel?', 'Die Platte war defekt.', 'Uran sendete unsichtbare Strahlung aus.', 'Es war kein Uran vorhanden.', 'Die Sonne war zu stark.', 'B'),
  (v_topic_id, 'Welche Aussage zur Nebelkammer ist richtig?', 'Sie zeigt nur Licht.', 'Sie macht Teilchenspuren als Linien sichtbar.', 'Sie misst Temperatur.', 'Sie misst nur Luftdruck.', 'B'),
  (v_topic_id, 'Was zeigt ein Geiger-Müller-Zähler an?', 'Nur Farben von Stoffen.', 'Nur die Uhrzeit.', 'Die Stärke der Strahlung über Impulse/Klicks.', 'Nur Magnetfelder.', 'C'),
  (v_topic_id, 'Was bedeutet Zählrate?', 'Anzahl der Klicks/Impulse pro Zeit.', 'Anzahl der Versuchspersonen.', 'Anzahl der Bilder.', 'Anzahl der Geräte.', 'A'),
  (v_topic_id, 'Was ist die Nullrate?', 'Die höchste Messung eines Tages.', 'Ein Gerätefehler.', 'Die Hintergrundstrahlung ohne Probe.', 'Die Strahlung nur im Labor.', 'C'),
  (v_topic_id, 'Warum zieht man bei Messungen die Nullrate ab?', 'Damit die Messung größer aussieht.', 'Um die zusätzliche Strahlung der Probe zu bestimmen.', 'Damit keine Klicks gezählt werden.', 'Nur aus mathematischen Gründen ohne Bedeutung.', 'B'),
  (v_topic_id, 'Warum ist der Glühstrumpf als Beispiel wichtig?', 'Seine Strahlung liegt nur wenig über der Nullrate.', 'Er erzeugt Strom.', 'Er blockiert jede Strahlung.', 'Er ersetzt den Geigerzähler.', 'A'),
  (v_topic_id, 'Was bedeutet es, wenn der Geigerzähler mehr Klicks pro Minute zeigt?', 'Das Gerät ist kaputt.', 'Die Batterie ist leer.', 'Die Strahlung ist stärker.', 'Die Raumtemperatur steigt.', 'C'),
  (v_topic_id, 'Welche Nobelpreise erhielt Marie Curie?', 'Zweimal Physik.', 'Einmal Biologie.', 'Nur Chemie.', 'Physik (1903) und Chemie (1911).', 'D'),
  (v_topic_id, 'Welche radioaktiven Elemente entdeckten die Curies?', 'Helium und Neon', 'Polonium und Radium', 'Gold und Silber', 'Lithium und Natrium', 'B'),
  (v_topic_id, 'Welche Methode macht Strahlung direkt als Linien sichtbar?', 'Fotoplatte', 'MRT', 'Nebelkammer', 'Kernkraftwerk', 'C');
END $$;

COMMIT;
