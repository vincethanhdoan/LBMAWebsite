import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-foreground px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span
              className="text-primary-foreground text-xs font-bold leading-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              LB
            </span>
          </div>
          <div>
            <p
              className="text-sm font-semibold text-primary-foreground leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              LBMAA Family Portal
            </p>
            <p className="text-[11px] text-primary-foreground/40 leading-tight">
              Los Banos Martial Arts Academy
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1 text-xs text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-12">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated July 10, 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* Intro */}
          <section>
            <p className="text-muted-foreground mb-4">
              This Privacy Notice for <strong>Los Banos Martial Arts Academy</strong> ("we," "us," or "our") describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>
                Visit our website at{' '}
                <a href="https://www.lbmartialarts.com/" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                  https://www.lbmartialarts.com/
                </a>
                {' '}or any website of ours that links to this Privacy Notice
              </li>
              <li>
                Use <strong>Los Banos Martial Arts Academy Website</strong> — a martial arts academy website and family communication platform that allows prospective families to request trial appointments, enrolled families to access academy information, and staff to manage announcements, messages, student/family records, and appointment-related communication.
              </li>
              <li>Engage with us in other related ways, including any marketing or events</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at{' '}
              <a href="mailto:westcoastlosbanos@gmail.com" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                westcoastlosbanos@gmail.com
              </a>.
            </p>
          </section>

          {/* Summary */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Summary of Key Points
            </h2>
            <p className="text-muted-foreground mb-4 italic">
              This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by using the table of contents below.
            </p>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.</p>
              <p><strong className="text-foreground">Do we process any sensitive personal information?</strong> Some information may be considered "special" or "sensitive" in certain jurisdictions. We may process sensitive personal information when necessary with your consent or as otherwise permitted by applicable law.</p>
              <p><strong className="text-foreground">Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>
              <p><strong className="text-foreground">How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</p>
              <p><strong className="text-foreground">In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties.</p>
              <p><strong className="text-foreground">How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission or information storage technology can be guaranteed to be 100% secure.</p>
              <p><strong className="text-foreground">What are your rights?</strong> Depending on where you are located, the applicable privacy law may mean you have certain rights regarding your personal information.</p>
              <p><strong className="text-foreground">How do you exercise your rights?</strong> The easiest way to exercise your rights is by visiting{' '}
                <a href="https://lbmartialarts.com/contact" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                  https://lbmartialarts.com/contact
                </a>{' '}or by contacting us.
              </p>
            </div>
          </section>

          {/* TOC */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Table of Contents
            </h2>
            <ol className="list-decimal pl-6 space-y-1 text-muted-foreground">
              {[
                ['infocollect', 'What Information Do We Collect?'],
                ['infouse', 'How Do We Process Your Information?'],
                ['whoshare', 'When and With Whom Do We Share Your Personal Information?'],
                ['cookies', 'Do We Use Cookies and Other Tracking Technologies?'],
                ['inforetain', 'How Long Do We Keep Your Information?'],
                ['infosafe', 'How Do We Keep Your Information Safe?'],
                ['infominors', 'Do We Collect Information From Minors?'],
                ['privacyrights', 'What Are Your Privacy Rights?'],
                ['DNT', 'Controls for Do-Not-Track Features'],
                ['uslaws', 'Do United States Residents Have Specific Privacy Rights?'],
                ['policyupdates', 'Do We Make Updates to This Notice?'],
                ['contact', 'How Can You Contact Us About This Notice?'],
                ['request', 'How Can You Review, Update, or Delete the Data We Collect From You?'],
              ].map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="hover:text-foreground transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </section>

          {/* 1 */}
          <section id="infocollect">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              1. What Information Do We Collect?
            </h2>
            <h3 className="font-semibold text-foreground mb-2">Personal information you disclose to us</h3>
            <p className="text-muted-foreground mb-3">
              <em>In Short: We collect personal information that you provide to us.</em>
            </p>
            <p className="text-muted-foreground mb-3">
              We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Personal Information Provided by You.</strong> The personal information we collect may include the following:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              {['names', 'phone numbers', 'email addresses', 'mailing addresses', 'contact preferences', 'child name', 'child age', 'child birthday', 'profile photos', 'child relationship', 'child belt level', 'child program', 'uploaded files and attachments', 'admin notes and instructor feedback', 'notification preferences', 'read/seen activity', 'appointment information'].map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-muted-foreground mb-2">
              <strong>Sensitive Information.</strong> When necessary, with your consent or as otherwise permitted by applicable law, we process the following categories of sensitive information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>health data</li>
              <li>student data</li>
            </ul>
            <p className="text-muted-foreground mb-6">
              All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.
            </p>

            <h3 className="font-semibold text-foreground mb-2">Information automatically collected</h3>
            <p className="text-muted-foreground mb-3">
              <em>In Short: Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.</em>
            </p>
            <p className="text-muted-foreground mb-3">
              We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, information about how and when you use our Services, and other technical information. This information is primarily needed to maintain the security and operation of our Services, and for our internal analytics and reporting purposes.
            </p>
            <p className="text-muted-foreground mb-3">
              Like many businesses, we also collect information through cookies and similar technologies.
            </p>
            <p className="text-muted-foreground mb-2">The information we collect includes:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-3">
              <li>
                <strong>Log and Usage Data.</strong> Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services and which we record in log files. Depending on how you interact with us, this log data may include your IP address, device information, browser type, and settings and information about your activity in the Services (such as the date/time stamps associated with your usage, pages and files viewed, searches, and other actions you take such as which features you use), device event information (such as system activity, error reports (sometimes called "crash dumps"), and hardware settings).
              </li>
              <li>
                <strong>Device Data.</strong> We collect device data such as information about your computer, phone, tablet, or other device you use to access the Services. Depending on the device used, this device data may include information such as your IP address (or proxy server), device and application identification numbers, browser type, hardware model, Internet service provider and/or mobile carrier, operating system, and system configuration information.
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section id="infouse">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              2. How Do We Process Your Information?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</em>
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong> We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
              <li><strong>To deliver and facilitate delivery of services to the user.</strong> We may process your information to provide you with the requested service.</li>
              <li><strong>To respond to user inquiries/offer support to users.</strong> We may process your information to respond to your inquiries and solve any potential issues you might have with the requested service.</li>
              <li><strong>To send administrative information to you.</strong> We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.</li>
              <li><strong>To enable user-to-user communications.</strong> We may process your information if you choose to use any of our offerings that allow for communication with another user.</li>
              <li><strong>To request feedback.</strong> We may process your information when necessary to request feedback and to contact you about your use of our Services.</li>
              <li><strong>To protect our Services.</strong> We may process your information as part of our efforts to keep our Services safe and secure, including fraud monitoring and prevention.</li>
              <li><strong>To evaluate and improve our Services, products, marketing, and your experience.</strong> We may process your information when we believe it is necessary to identify usage trends, determine the effectiveness of our promotional campaigns, and to evaluate and improve our Services, products, marketing, and your experience.</li>
              <li><strong>To identify usage trends.</strong> We may process information about how you use our Services to better understand how they are being used so we can improve them.</li>
              <li><strong>To comply with our legal obligations.</strong> We may process your information to comply with our legal obligations, respond to legal requests, and exercise, establish, or defend our legal rights.</li>
            </ul>
          </section>

          {/* 3 */}
          <section id="whoshare">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              3. When and With Whom Do We Share Your Personal Information?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: We may share information in specific situations described in this section and/or with the following third parties.</em>
            </p>
            <p className="text-muted-foreground mb-2">We may need to share your personal information in the following situations:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-3">
              <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
              <li><strong>When we use Google Maps Platform APIs.</strong> We may share your information with certain Google Maps Platform APIs (e.g., Google Maps API, Places API). Google Maps uses GPS, Wi-Fi, and cell towers to estimate your location. GPS is accurate to about 20 meters, while Wi-Fi and cell towers help improve accuracy when GPS signals are weak, like indoors. This data helps Google Maps provide directions, but it is not always perfectly precise.</li>
              <li><strong>Other Users.</strong> When you share personal information (for example, by posting comments, contributions, or other content to the Services) or otherwise interact with public areas of the Services, such personal information may be viewed by all users and may be publicly made available outside the Services in perpetuity. Similarly, other users will be able to view descriptions of your activity, communicate with you within our Services, and view your profile.</li>
            </ul>
          </section>

          {/* 4 */}
          <section id="cookies">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              4. Do We Use Cookies and Other Tracking Technologies?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: We use only the cookies and similar technologies necessary for our Services to function.</em>
            </p>
            <p className="text-muted-foreground mb-3">
              We use cookies and similar technologies (such as browser local storage) only for essential site functions — for example, keeping you signed in to the family portal, maintaining the security of your session, and saving your preferences such as language selection.
            </p>
            <p className="text-muted-foreground">
              We do not use advertising cookies, and we do not permit third parties to use tracking technologies on our Services for advertising purposes. Most browsers allow you to refuse or delete cookies through their settings; however, if you disable essential cookies, some parts of the Services (such as signing in to the portal) may not work.
            </p>
          </section>

          {/* 5 */}
          <section id="inforetain">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              5. How Long Do We Keep Your Information?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</em>
            </p>
            <p className="text-muted-foreground mb-3">
              We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.
            </p>
            <p className="text-muted-foreground">
              When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.
            </p>
          </section>

          {/* 6 */}
          <section id="infosafe">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              6. How Do We Keep Your Information Safe?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: We aim to protect your personal information through a system of organizational and technical security measures.</em>
            </p>
            <p className="text-muted-foreground">
              We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.
            </p>
          </section>

          {/* 7 */}
          <section id="infominors">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              7. Do We Collect Information From Minors?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: We do not knowingly collect data from or market to minors.</em>
            </p>
            <p className="text-muted-foreground">
              Our website and family portal are intended for use by parents, legal guardians, prospective families, and academy staff. We do not knowingly allow children under 13 to create accounts, register, submit information, or directly use the portal. Parents or legal guardians may provide information about their child or student for enrollment, scheduling, communication, class participation, and academy administration purposes. If we learn that a child has provided personal information directly without parent or guardian involvement, we will take appropriate steps to delete or restrict that information.
            </p>
          </section>

          {/* 8 */}
          <section id="privacyrights">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              8. What Are Your Privacy Rights?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.</em>
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Withdrawing your consent:</strong> If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section{' '}
              <a href="#contact" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                How Can You Contact Us About This Notice?
              </a>{' '}
              below.
            </p>
            <p className="text-muted-foreground mb-4">
              However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.
            </p>
            <h3 className="font-semibold text-foreground mb-2">Account Information</h3>
            <p className="text-muted-foreground mb-2">If you would at any time like to review or change the information in your account or terminate your account, you can:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Log in to your account settings and update your user account.</li>
              <li>Users may request account deletion by contacting Los Banos Martial Arts Academy through the contact information listed in this Privacy Policy. Account deletion requests may be subject to verification and may not include records we are required or permitted to retain for legal, security, administrative, or academy operation purposes.</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.
            </p>
            <p className="text-muted-foreground">
              If you have questions or comments about your privacy rights, you may email us at{' '}
              <a href="mailto:westcoastlosbanos@gmail.com" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                westcoastlosbanos@gmail.com
              </a>.
            </p>
          </section>

          {/* 9 */}
          <section id="DNT">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              9. Controls for Do-Not-Track Features
            </h2>
            <p className="text-muted-foreground mb-3">
              Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.
            </p>
            <p className="text-muted-foreground">
              California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.
            </p>
          </section>

          {/* 10 */}
          <section id="uslaws">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              10. Do United States Residents Have Specific Privacy Rights?
            </h2>
            <p className="text-muted-foreground mb-4">
              <em>In Short: If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. More information is provided below.</em>
            </p>

            <h3 className="font-semibold text-foreground mb-3">Categories of Personal Information We Collect</h3>
            <p className="text-muted-foreground mb-4">
              The table below shows the categories of personal information we have collected in the past twelve (12) months.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-3 py-2 text-left font-semibold text-foreground w-2/5">Category</th>
                    <th className="border border-border px-3 py-2 text-left font-semibold text-foreground w-2/5">Examples</th>
                    <th className="border border-border px-3 py-2 text-left font-semibold text-foreground w-1/5">Collected</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['A. Identifiers', 'Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name', 'YES'],
                    ['B. Personal information as defined in the California Customer Records statute', 'Name, contact information, education, employment, employment history, and financial information', 'YES'],
                    ['C. Protected classification characteristics under state or federal law', 'Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data', 'YES'],
                    ['D. Commercial information', 'Transaction information, purchase history, financial details, and payment information', 'NO'],
                    ['E. Biometric information', 'Fingerprints and voiceprints', 'NO'],
                    ['F. Internet or other similar network activity', 'Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements', 'NO'],
                    ['G. Geolocation data', 'Device location', 'NO'],
                    ['H. Audio, electronic, sensory, or similar information', 'Images and audio, video or call recordings created in connection with our business activities', 'NO'],
                    ['I. Professional or employment-related information', 'Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us', 'NO'],
                    ['J. Education Information', 'Student records and directory information', 'NO'],
                    ['K. Inferences drawn from collected personal information', 'Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual\'s preferences and characteristics', 'NO'],
                    ['L. Sensitive personal Information', 'Account login information and health data', 'YES'],
                  ].map(([cat, ex, col]) => (
                    <tr key={cat}>
                      <td className="border border-border px-3 py-2 align-top">{cat}</td>
                      <td className="border border-border px-3 py-2 align-top">{ex}</td>
                      <td className="border border-border px-3 py-2 align-top font-medium text-foreground">{col}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground mb-4">
              We only collect sensitive personal information, as defined by applicable privacy laws or the purposes allowed by law or with your consent. Sensitive personal information may be used, or disclosed to a service provider or contractor, for additional, specified purposes. You may have the right to limit the use or disclosure of your sensitive personal information. We do not collect or process sensitive personal information for the purpose of inferring characteristics about you.
            </p>
            <p className="text-muted-foreground mb-2">
              We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Receiving help through our customer support channels;</li>
              <li>Participation in customer surveys or contests; and</li>
              <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
            </ul>
            <p className="text-muted-foreground mb-2">
              We will use and retain the collected personal information as needed to provide the Services or for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-6">
              {['A', 'B', 'C', 'L'].map(cat => (
                <li key={cat}>Category {cat} — As long as the user has an account with us</li>
              ))}
            </ul>

            <h3 className="font-semibold text-foreground mb-2">Sources of Personal Information</h3>
            <p className="text-muted-foreground mb-4">
              Learn more about the sources of personal information we collect in{' '}
              <a href="#infocollect" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                What Information Do We Collect?
              </a>
            </p>

            <h3 className="font-semibold text-foreground mb-2">How We Use and Share Personal Information</h3>
            <p className="text-muted-foreground mb-4">
              Learn more about how we use your personal information in the section{' '}
              <a href="#infouse" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                How Do We Process Your Information?
              </a>
            </p>

            <h3 className="font-semibold text-foreground mb-2">Will your information be shared with anyone else?</h3>
            <p className="text-muted-foreground mb-3">
              We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Learn more about how we disclose personal information in the section{' '}
              <a href="#whoshare" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                When and With Whom Do We Share Your Personal Information?
              </a>
            </p>
            <p className="text-muted-foreground mb-3">
              We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.
            </p>
            <p className="text-muted-foreground mb-6">
              We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We will not sell or share personal information in the future belonging to website visitors, users, and other consumers.
            </p>

            <h3 className="font-semibold text-foreground mb-2">Your Rights</h3>
            <p className="text-muted-foreground mb-2">
              You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. These rights include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Right to know</strong> whether or not we are processing your personal data</li>
              <li><strong>Right to access</strong> your personal data</li>
              <li><strong>Right to correct</strong> inaccuracies in your personal data</li>
              <li><strong>Right to request</strong> the deletion of your personal data</li>
              <li><strong>Right to obtain a copy</strong> of the personal data you previously shared with us</li>
              <li><strong>Right to non-discrimination</strong> for exercising your rights</li>
              <li><strong>Right to opt out</strong> of the processing of your personal data if it is used for targeted advertising (or sharing as defined under California's privacy law), the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling")</li>
            </ul>
            <p className="text-muted-foreground mb-2">Depending upon the state where you live, you may also have the following rights:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Right to access the categories of personal data being processed (as permitted by applicable law, including the privacy law in Minnesota)</li>
              <li>Right to obtain a list of the categories of third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in California, Delaware, and Maryland)</li>
              <li>Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in Minnesota and Oregon)</li>
              <li>Right to obtain a list of third parties to which we have sold personal data (as permitted by applicable law, including the privacy law in Connecticut)</li>
              <li>Right to review, understand, question, and depending on where you live, correct how personal data has been profiled (as permitted by applicable law, including the privacy law in Connecticut and Minnesota)</li>
              <li>Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including the privacy law in California)</li>
              <li>Right to opt out of the collection of sensitive data and personal data collected through the operation of a voice or facial recognition feature (as permitted by applicable law, including the privacy law in Florida)</li>
            </ul>

            <h3 className="font-semibold text-foreground mb-2">How to Exercise Your Rights</h3>
            <p className="text-muted-foreground mb-6">
              To exercise these rights, you can contact us by visiting{' '}
              <a href="https://lbmartialarts.com/contact" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                https://lbmartialarts.com/contact
              </a>, by emailing us at{' '}
              <a href="mailto:westcoastlosbanos@gmail.com" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                westcoastlosbanos@gmail.com
              </a>, by calling us at{' '}
              <a href="tel:+14086200252" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                (408) 620-0252
              </a>, or by referring to the contact details at the bottom of this document.
            </p>
            <p className="text-muted-foreground mb-6">
              Under certain US state data protection laws, you can designate an authorized agent to make a request on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with applicable laws.
            </p>

            <h3 className="font-semibold text-foreground mb-2">Request Verification</h3>
            <p className="text-muted-foreground mb-3">
              Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We will only use personal information provided in your request to verify your identity or authority to make the request. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes.
            </p>
            <p className="text-muted-foreground mb-6">
              If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request and the agent will need to provide a written and signed permission from you to submit such request on your behalf.
            </p>

            <h3 className="font-semibold text-foreground mb-2">Appeals</h3>
            <p className="text-muted-foreground mb-6">
              Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at{' '}
              <a href="mailto:westcoastlosbanos@gmail.com" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                westcoastlosbanos@gmail.com
              </a>. We will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal is denied, you may submit a complaint to your state attorney general.
            </p>

            <h3 className="font-semibold text-foreground mb-2">California "Shine The Light" Law</h3>
            <p className="text-muted-foreground">
              California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us by using the contact details provided in the section{' '}
              <a href="#contact" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                How Can You Contact Us About This Notice?
              </a>
            </p>
          </section>

          {/* 11 */}
          <section id="policyupdates">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              11. Do We Make Updates to This Notice?
            </h2>
            <p className="text-muted-foreground mb-3">
              <em>In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.</em>
            </p>
            <p className="text-muted-foreground">
              We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.
            </p>
          </section>

          {/* 12 */}
          <section id="contact">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              12. How Can You Contact Us About This Notice?
            </h2>
            <p className="text-muted-foreground mb-4">
              If you have questions or comments about this notice, you may email us at{' '}
              <a href="mailto:westcoastlosbanos@gmail.com" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                westcoastlosbanos@gmail.com
              </a>{' '}
              or contact us by post at:
            </p>
            <address className="not-italic text-muted-foreground">
              Los Banos Martial Arts Academy<br />
              1209 South 6th Street Suite E<br />
              Los Banos, CA 93635<br />
              United States
            </address>
          </section>

          {/* 13 */}
          <section id="request">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              13. How Can You Review, Update, or Delete the Data We Collect From You?
            </h2>
            <p className="text-muted-foreground">
              Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please visit:{' '}
              <a href="https://lbmartialarts.com/contact" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                https://lbmartialarts.com/contact
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
