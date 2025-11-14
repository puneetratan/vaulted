Pod::Spec.new do |s|
    s.name     = "boost_custom"
    s.version  = "1.76.0"
    s.summary  = "Boost C++ Libraries"
    s.homepage = "https://www.boost.org"
    s.source   = { :http => "https://github.com/boostorg/boost/releases/download/boost-1.76.0/boost_1_76_0.tar.gz" }
    s.author   = "Boost"
    s.license  = { :type => "Boost Software License", :file => "LICENSE_1_0.txt" }
    s.requires_arc = false
    s.header_mappings_dir = "boost"
    s.source_files = "boost/**/*.hpp"
  end
  